#!/bin/bash

# CI/CD Local Testing Script
# This script runs the same checks that the GitHub Actions CI runs locally

set -e  # Exit on any error

echo "🚀 Starting CI/CD Local Testing..."

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running linting..."
npm run lint

echo "🏗️ Building project..."
npm run build

echo "🧪 Running tests..."
npm test

echo "📊 Running test coverage..."
npm run test:coverage

echo "🔒 Running security audit..."
npm audit --audit-level=moderate

echo "✅ All CI/CD checks passed locally!"
echo "🎉 Your code is ready for commit/push!"