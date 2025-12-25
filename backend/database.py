from pymongo import MongoClient
from config import MONGO_URI

# Initialize variables
client = None
db = None
users_collection = None

try:
    # Create the MongoDB client with longer timeout and retry
    client = MongoClient(
        MONGO_URI, 
        serverSelectionTimeoutMS=10000,  # Increased timeout to 10 seconds
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        retryWrites=True
    )
    
    # Select the database
    db = client.saarthi_db
    
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")
    
    # Export the users collection
    users_collection = db["users"]

except Exception as e:
    print("❌ Could not connect to MongoDB:", e)
    print("⚠️  Database operations will fail until connection is established.")
    print("💡 Troubleshooting tips:")
    print("   1. Verify the cluster name in MongoDB Atlas dashboard")
    print("   2. Check if the cluster is fully provisioned (may take a few minutes)")
    print("   3. Verify your IP is whitelisted in MongoDB Atlas Network Access")
    print("   4. Check if the username and password are correct")
    # Set db to None so we can check it later
    db = None
    users_collection = None

# Counter for auto-incrementing IDs
def get_next_sequence(name: str) -> int:
    """Get the next sequence number for auto-incrementing IDs."""
    if db is None:
        raise ConnectionError("Database connection not established. Please check MongoDB connection.")
    counter = db["counters"].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return counter["seq"]