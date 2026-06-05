from dotenv import load_dotenv
import os
from flask import Flask, render_template, redirect, url_for, request, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
from flask_cors import CORS

# =====================================================
# APP SETUP
# =====================================================
load_dotenv()

_secret = os.environ.get("SECRET_KEY")
if not _secret:
    import warnings
    warnings.warn("SECRET_KEY not set — using insecure default. Set it in .env before deploying.")
    _secret = "kantaka_dev_secret_2024"

app = Flask(__name__)
app.config["SECRET_KEY"] = _secret
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == "production"
app.config["SESSION_COOKIE_HTTPONLY"] = True

CORS(app, supports_credentials=True, origins=[
    "http://localhost:3002",
    "http://localhost:3000",
])

# =====================================================
# DATABASE CONFIG (SUPABASE SAFE)
# =====================================================
database_url = os.environ.get("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL is not set.")

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if "sslmode" not in database_url:
    if "?" in database_url:
        database_url += "&sslmode=require"
    else:
        database_url += "?sslmode=require"

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

db = SQLAlchemy(app)

@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()

# =====================================================
# LOGIN MANAGER
# =====================================================

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# =====================================================
# MODELS
# =====================================================

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    purpose = db.Column(db.Text)
    is_approved = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)

@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except:
        return None

# =====================================================
# DATABASE INIT
# =====================================================

with app.app_context():
    db.create_all()

    if not User.query.filter_by(username="admin").first():
        hashed_pw = generate_password_hash("Admin@12345", method="pbkdf2:sha256")

        admin = User(
            username="admin",
            email="admin@kantaka.ai",
            phone="0000000000",
            password=hashed_pw,
            purpose="admin_setup",
            is_approved=True,
            is_admin=True
        )

        db.session.add(admin)
        db.session.commit()

# =====================================================
# ROUTES
# =====================================================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

# ---------------- REGISTER & LOGIN ----------------

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        try:
            username = request.form.get("username")
            email = request.form.get("email")
            password = request.form.get("password")
            phone = request.form.get("phone")
            purpose = request.form.get("purpose")

            if User.query.filter_by(email=email).first():
                flash("Email already exists.", "danger")
                return redirect(url_for("register"))

            hashed_pw = generate_password_hash(password, method="pbkdf2:sha256")

            new_user = User(
                username=username,
                email=email,
                phone=phone,
                password=hashed_pw,
                purpose=purpose
            )

            db.session.add(new_user)
            db.session.commit()

            flash("Registration successful! Please wait for admin approval.", "info")
            return redirect(url_for("login"))

        except SQLAlchemyError:
            db.session.rollback()
            return "Registration Database Error", 500

    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        try:
            email = request.form.get("email")
            password = request.form.get("password")

            user = User.query.filter_by(email=email).first()

            if user and check_password_hash(user.password, password):
                if not user.is_approved:
                    flash("Your account is pending admin approval.", "warning")
                    return redirect(url_for("login"))

                login_user(user)
                return redirect(url_for("index"))

            flash("Login failed. Check details and try again.", "danger")

        except SQLAlchemyError:
            return "Login Database Error", 500

    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

# ---------------- ADMIN PANEL ----------------

@app.route("/admin")
@login_required
def admin_panel():
    if not current_user.is_admin:
        return "Access Denied", 403

    try:
        pending = User.query.filter_by(is_approved=False).all()
        active = User.query.filter_by(is_approved=True, is_admin=False).all()
        return render_template("admin_panel.html", pending=pending, active=active)

    except SQLAlchemyError:
        return "Admin Database Error", 500

@app.route("/approve/<int:user_id>")
@login_required
def approve_user(user_id):
    if not current_user.is_admin: return "Access Denied", 403
    try:
        user = db.session.get(User, user_id)
        if user:
            user.is_approved = True
            db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return "Approve Database Error", 500
    return redirect(url_for("admin_panel"))

@app.route("/reject/<int:user_id>")
@login_required
def reject_user(user_id):
    if not current_user.is_admin: return "Access Denied", 403
    try:
        user = db.session.get(User, user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return "Reject Database Error", 500
    return redirect(url_for("admin_panel"))

@app.route("/revoke/<int:user_id>")
@login_required
def revoke_access(user_id):
    if not current_user.is_admin: return "Access Denied", 403
    try:
        user = db.session.get(User, user_id)
        if user:
            user.is_approved = False
            db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return "Revoke Database Error", 500
    return redirect(url_for("admin_panel"))

# =====================================================
# FACE VERIFICATION LOGIC (MERGED)
# =====================================================

# @app.route("/api/verify-face", methods=["POST"])
# @login_required
# def api_verify_face():
#     """ 
#     API endpoint for asynchronous face verification.
#     Processes images directly from memory without saving files.
#     """
#     selfie = request.files.get("selfie")
#     document = request.files.get("document")

#     if not selfie or not document:
#         return jsonify({"error": "Images missing"}), 400

#     # Passing files directly to your engine
#     # Ensure face_engine/verify.py can accept file objects/streams
#     score, decision, confidence = verify_faces(selfie, document)

#     return jsonify({
#         "similarity": score,
#         "decision": decision,
#         "confidence": confidence
#     })

# @app.route("/usecases/face-verification")
# @login_required
# def face_verify():
#     """ Renders the main Face Verification UI """
#     return render_template("uc_face_verify.html")

# =====================================================
# PROTECTED USE CASES
# =====================================================

@app.route("/mlops")
@login_required
def mlops(): return render_template("mlops.html")

@app.route("/architecture")
@login_required
def architecture(): return render_template("architecture.html")

@app.route("/usecases")
@login_required
def usecases(): return render_template("usecases.html")

# @app.route("/usecases/same-day-fraud")
# @login_required
# def same_day(): return render_template("uc_same_day.html")

# @app.route("/usecases/family-cluster")
# @login_required
# def family_cluster(): return render_template("uc_family_cluster.html")

# @app.route("/usecases/provider-risk")
# @login_required
# def provider_risk(): return render_template("uc_provider_risk.html")

# @app.route("/usecases/document-duplication")
# @login_required
# def doc_duplicate(): return render_template("uc_doc_duplicate.html")

# @app.route("/usecases/document-tampering")
# @login_required
# def doc_tampering(): return render_template("uc_doc_tampering.html")

# =====================================================
# RUN
# =====================================================

# =====================================================
# JSON API (for Next.js frontend)
# =====================================================

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    try:
        user = User.query.filter_by(email=data.get("email")).first()
        if not user or not check_password_hash(user.password, data.get("password", "")):
            return jsonify({"error": "Invalid credentials"}), 401
        if not user.is_approved:
            return jsonify({"error": "Account pending admin approval"}), 403
        login_user(user)
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_approved": user.is_approved,
        })
    except SQLAlchemyError:
        return jsonify({"error": "Database error"}), 500

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    try:
        if not data.get("username") or not data.get("email") or not data.get("password"):
            return jsonify({"error": "Username, email, and password are required"}), 400
        if len(data.get("password", "")) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        if User.query.filter_by(email=data.get("email")).first():
            return jsonify({"error": "Email already registered"}), 409
        if User.query.filter_by(username=data.get("username")).first():
            return jsonify({"error": "Username already taken"}), 409
        hashed_pw = generate_password_hash(data.get("password", ""), method="pbkdf2:sha256")
        new_user = User(
            username=data.get("username"),
            email=data.get("email"),
            phone=data.get("phone", ""),
            password=hashed_pw,
            purpose=data.get("purpose", ""),
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Registration successful. Awaiting admin approval."}), 201
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Database error"}), 500

@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    logout_user()
    return jsonify({"message": "Logged out"})

@app.route("/api/auth/me")
def api_me():
    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin,
            "is_approved": current_user.is_approved,
        })
    return jsonify({"error": "Not authenticated"}), 401

@app.route("/api/admin/users")
@login_required
def api_admin_users():
    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403
    try:
        pending = [{"id": u.id, "username": u.username, "email": u.email, "phone": u.phone, "purpose": u.purpose}
                   for u in User.query.filter_by(is_approved=False).all()]
        active = [{"id": u.id, "username": u.username, "email": u.email}
                  for u in User.query.filter_by(is_approved=True, is_admin=False).all()]
        return jsonify({"pending": pending, "active": active})
    except SQLAlchemyError:
        return jsonify({"error": "Database error"}), 500

@app.route("/api/admin/approve/<int:user_id>", methods=["POST"])
@login_required
def api_approve_user(user_id):
    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        user.is_approved = True
        db.session.commit()
        return jsonify({"message": "User approved"})
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Database error"}), 500

@app.route("/api/admin/reject/<int:user_id>", methods=["POST"])
@login_required
def api_reject_user(user_id):
    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User rejected"})
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Database error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
