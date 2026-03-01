"""
Shared logging configuration for all services
Provides structured JSON logging with context
"""
import logging
import sys
import os
from loguru import logger
from shared.config import get_settings

settings = get_settings()


def setup_logging(service_name: str):
    """
    Configure loguru for the service
    
    Args:
        service_name: Name of the service (voice, agent, document, orchestrator)
    """
    # Fix windows utf-8 printing for loguru emojis
    if sys.platform == "win32":
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
    
    # Remove default handler
    logger.remove()
    
    # Add console handler
    if settings.log_format == "json":
        logger.add(sys.stdout, serialize=True, level=settings.log_level)
    else:
        logger.add(
            sys.stdout,
            format=(
                "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>" + service_name + "</cyan> | "
                "<level>{message}</level>"
            ),
            level=settings.log_level,
            colorize=True,
        )
    
    # Add file handler with enqueue=True for Windows compatibility (avoids file locking)
    # Use process ID in log filename to prevent conflicts between rapid restarts
    pid = os.getpid()
    log_path = f"logs/{service_name}.log"
    
    try:
        os.makedirs("logs", exist_ok=True)
        if settings.log_format == "json":
            logger.add(
                log_path,
                serialize=True,
                level=settings.log_level,
                rotation="100 MB",
                retention="7 days",
                compression="zip",
                enqueue=True,   # Thread-safe, Windows-compatible
                delay=True,     # Don't open file until first log entry
            )
        else:
            logger.add(
                log_path,
                format=(
                    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
                    "<level>{level: <8}</level> | "
                    "<cyan>" + service_name + "</cyan> | "
                    "<level>{message}</level>"
                ),
                level=settings.log_level,
                rotation="100 MB",
                retention="7 days",
                compression="zip",
                enqueue=True,   # Thread-safe, Windows-compatible
                delay=True,     # Don't open file until first log entry
            )
    except Exception as e:
        # If file logging fails, just use console
        print(f"Warning: Could not set up file logging for {service_name}: {e}")
    
    logger.info(f"{service_name} logging initialized", level=settings.log_level)
    
    return logger
