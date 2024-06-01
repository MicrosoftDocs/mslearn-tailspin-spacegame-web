#Joey testing
from flask import Flask, request, render_template, redirect, url_for
from cryptography.fernet import Fernet
import os

app = Flask(__name__)

# Generate a random secret key for encryption (store securely)
SECRET_KEY = os.urandom(32)
key = Fernet.generate_key()
#Fernet.generate_key()
#fernet = Fernet(SECRET_KEY)

# In-memory storage for user data (replace with a database in production)
users = {}

#
#  Simulated flight data (replace with actual API calls)
flights = {
    "SEA-LAX": {"price": 250, "airline": "Delta"},
    "SEA-JFK": {"price": 400, "airline": "American Airlines"},
    # Add more flights...
}

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        email = request.form.get("email")
        if email:
            # Encrypt the email before storing it
            encrypted_email = fernet.encrypt(email.encode()).decode()
            users[encrypted_email] = True
            # Send a magic link to the user's email (not implemented here)
            return f"Magic link sent to {email}. Check your inbox!"
    return render_template("index.html")

@app.route("/login/<magic_link>")
def login(magic_link):
    # Decrypt the email from the magic link
    decrypted_email = fernet.decrypt(magic_link.encode()).decode()
    if decrypted_email in users:
        # Log the user in (session management, etc.)
        return f"Logged in as {decrypted_email}"
    return "Invalid magic link"

@app.route("/search_flights")
def search_flights():
    # Simulated flight search results
    return flights

if __name__ == "__main__":
    app.run(debug=True)
