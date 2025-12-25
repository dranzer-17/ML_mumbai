import logging
import os

# Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# Configure the logger
logging.basicConfig(
    filename="logs/app.log",
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

def get_logger(name: str):
    """Get a logger instance for a module."""
    return logging.getLogger(name)
