# CI/CD Local Testing Script (PowerShell)
# This script runs the same checks that the GitHub Actions CI runs locally

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting CI/CD Local Testing..." -ForegroundColor Green

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "🔍 Running linting..." -ForegroundColor Yellow
npm run lint

Write-Host "🏗️ Building project..." -ForegroundColor Yellow
npm run build

Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test

Write-Host "📊 Running test coverage..." -ForegroundColor Yellow
npm run test:coverage

Write-Host "🔒 Running security audit..." -ForegroundColor Yellow
npm audit --audit-level=moderate

Write-Host "✅ All CI/CD checks passed locally!" -ForegroundColor Green
Write-Host "🎉 Your code is ready for commit/push!" -ForegroundColor Green