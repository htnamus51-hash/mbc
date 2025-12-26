"""
Compatibility shim for Pydantic v1/v2 and Python 3.13+ support.
Provides basic backward compatibility if needed.
"""
import sys

# For Pydantic v2, ConfigDict replaces Config class
try:
    from pydantic import ConfigDict
except ImportError:
    # Pydantic v1 fallback
    ConfigDict = None

# Ensure compatibility across versions
__all__ = ['ConfigDict']

