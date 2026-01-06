"""
Setup script for Guardrail system.

This is optional - Guardrail can run without installation.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_file = Path(__file__).parent / "GUARDRAIL_README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

setup(
    name="guardrail",
    version="1.0.0",
    description="Automated Code Quality & Maintainability System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Liquor POS Team",
    python_requires=">=3.8",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "guardrail=guardrail.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Quality Assurance",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)

