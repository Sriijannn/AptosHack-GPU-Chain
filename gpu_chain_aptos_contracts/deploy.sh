#!/bin/bash

echo "🚀 GPU Chain Aptos Contract Deployment"
echo "======================================"

# Step 1: Check Aptos CLI installation
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Installing..."
    curl -fsSL https://aptos.dev/scripts/install_cli.py | python3
fi

echo "✅ Aptos CLI version: $(aptos --version)"

# Step 2: Fund the account with devnet APT
echo "💰 Funding devnet account..."
aptos account fund-with-faucet --profile default

# Wait for funding to complete
sleep 3

# Step 3: Check account balance
echo "💳 Account balance:"
aptos account balance --profile default

# Step 4: Compile the Move module
echo "🔨 Compiling Move contract..."
aptos move compile --named-addresses gpu_chain=default

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed. Please check your Move code."
    exit 1
fi

echo "✅ Compilation successful!"

# Step 5: Run tests (if any)
echo "🧪 Running tests..."
aptos move test --named-addresses gpu_chain=default

# Step 6: Deploy to devnet
echo "🚀 Deploying contract to Aptos devnet..."
aptos move publish \
    --named-addresses gpu_chain=default \
    --profile default \
    --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed."
    exit 1
fi

echo "✅ Contract deployed successfully!"

# Step 7: Get deployment info
ACCOUNT_ADDR=$(aptos config show-profiles --profile default | grep "account:" | awk '{print $2}')

echo ""
echo "📋 Deployment Summary"
echo "===================="
echo "Module Address: $ACCOUNT_ADDR"
echo "Module Name: compute_reward"
echo "Full Module ID: ${ACCOUNT_ADDR}::compute_reward"
echo "Network: Aptos Devnet"
echo ""

# Step 8: Initialize the contract
echo "⚙️ Initializing contract..."
aptos move run \
    --function-id "${ACCOUNT_ADDR}::compute_reward::initialize" \
    --profile default \
    --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ Contract initialization failed."
    exit 1
fi

echo "✅ Contract initialized successfully!"

# Step 9: Save deployment info
cat > deployment-info.json << EOF
{
  "moduleAddress": "$ACCOUNT_ADDR",
  "moduleName": "compute_reward", 
  "fullModuleId": "${ACCOUNT_ADDR}::compute_reward",
  "network": "devnet",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rpcUrl": "https://fullnode.devnet.aptoslabs.com",
  "explorerUrl": "https://explorer.aptoslabs.com/account/${ACCOUNT_ADDR}?network=devnet"
}
EOF

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "✅ Contract deployed and initialized"
echo "✅ Deployment info saved to deployment-info.json"
echo ""
echo "🔗 View on Explorer:"
echo "https://explorer.aptoslabs.com/account/${ACCOUNT_ADDR}?network=devnet"
echo ""
echo "📝 Next Steps:"
echo "1. Update your frontend blockchain-aptos.js with module address: $ACCOUNT_ADDR"
echo "2. Test the contract functions"
echo "3. Start your frontend application"
echo ""
echo "🏃‍♂️ Quick Test Commands:"
echo "aptos move run --function-id '${ACCOUNT_ADDR}::compute_reward::register_worker' --args 'string:test-peer-123' 'address:$ACCOUNT_ADDR' --profile default"
echo ""