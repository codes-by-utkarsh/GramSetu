"""
Shared logging configuration for all services
Provides structured JSON logging with context
"""
import logging
import sys
from loguru import logger
from shared.config import get_settings

settings = get_settings()


def setup_logging(service_name: str):
    """
    Configure loguru for the service
    
    Args:
        service_name: Name of the service (voice, agent, document, orchestrator)
    """
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
    
    # Add file handler
    if settings.log_format == "json":
        logger.add(
            f"logs/{service_name}.log",
            serialize=True,
            level=settings.log_level,
            rotation="100 MB",
            retention="7 days",
            compression="zip",
        )
    else:
        logger.add(
            f"logs/{service_name}.log",
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
        )
    
    logger.info(f"{service_name} logging initialized", level=settings.log_level)
    
    return logger
