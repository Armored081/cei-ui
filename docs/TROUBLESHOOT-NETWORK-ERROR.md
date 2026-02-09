# Troubleshoot: "Network connection failed before a response was received"

## Problem
User logs into CEI UI successfully, sends "hi" message, and gets error:
> "Network connection failed before a response was received"

## What's Working
1. ✅ Cognito login works (user can authenticate)
2. ✅ Lambda proxy works via curl (tested, returns streaming SSE)
3. ✅ Agent responds correctly with streaming data

## Curl Test (Working)
```bash
TOKEN=$(aws cognito-idp initiate-auth ...)
curl -X POST "https://27mpgzp7ni.execute-api.us-east-1.amazonaws.com/invoke" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","sessionId":"test123"}'

# Returns:
data: {"type":"delta","content":"Hello! I'm"}
data: {"type":"delta","content":" your"}
data: {"type":"delta","content":" Cyber"}
...
```

## Likely Causes

### 1. CORS Issue (Most Likely)
Lambda returns CORS headers, but API Gateway HTTP API might not be forwarding them properly, or the browser is blocking due to preflight failure.

Check:
- OPTIONS preflight handling
- Access-Control-Allow-Origin header
- Access-Control-Allow-Headers header

### 2. Response Format Issue
UI might expect a different response format or have issues parsing SSE stream.

### 3. Timeout Issue
Lambda or API Gateway might be timing out before streaming completes.

### 4. Authentication Token Issue
Token might be getting passed incorrectly from UI to API Gateway.

## Files to Investigate

### UI Side (~/development/cei-ui/)
- `src/services/agentService.ts` - API call implementation
- `src/hooks/useAgentStream.ts` - Streaming response handler
- `src/config/api.ts` - API configuration
- `.env.production` - Environment variables

### Lambda Side (/tmp/lambda-proxy/)
- `index.mjs` - Lambda handler (just updated to fix streaming)

## Current Lambda CORS Headers
```javascript
const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
```

## AWS Resources
- **API Gateway:** 27mpgzp7ni (HTTP API)
- **Lambda:** cei-dev-api-proxy
- **Cognito Pool:** us-east-1_4KdGB3rG2
- **Cognito Client:** 1qqgt87ehgc87bjb55s8jdpqff
- **UI URL:** http://cei-ui-hosting-149425764951.s3-website-us-east-1.amazonaws.com/

## Task

1. Check browser console/network tab behavior (simulate or analyze code)
2. Verify CORS configuration on API Gateway HTTP API
3. Check UI's fetch implementation for SSE streaming
4. Identify the root cause
5. Propose fix

**IMPORTANT:** Report findings back before executing changes unless the fix is minor (typo, config tweak). If minor, commit to GitHub and notify for deployment.

## Debug Commands

### Check API Gateway CORS
```bash
aws apigatewayv2 get-api --api-id 27mpgzp7ni --profile cei-dev
aws apigatewayv2 get-routes --api-id 27mpgzp7ni --profile cei-dev
```

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/cei-dev-api-proxy --follow --profile cei-dev
```

### Test CORS Preflight
```bash
curl -X OPTIONS "https://27mpgzp7ni.execute-api.us-east-1.amazonaws.com/invoke" \
  -H "Origin: http://cei-ui-hosting-149425764951.s3-website-us-east-1.amazonaws.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v
```
