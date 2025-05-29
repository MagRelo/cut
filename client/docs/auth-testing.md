# Authentication Testing Guide

This guide covers manual testing procedures for all authentication-related functionality in the application.

## Prerequisites

- Clear browser cache and local storage before testing
- Have access to both email and phone number for testing
- Have a test email account ready for verification codes
- Have a test phone number ready for SMS verification codes

## 1. Anonymous User Flow

### 1.1 Initial Anonymous User Creation

- [ ] Open application in incognito/private window
- [ ] Verify that a new anonymous user is created automatically
- [ ] Check localStorage for `publicUserGuid`
- [ ] Verify that the user can browse public leagues and teams

### 1.2 Anonymous User Upgrade

- [ ] Click "Upgrade Account" or similar button
- [ ] Test with email:
  - [ ] Enter valid email address
  - [ ] Verify "Request Code" button is enabled
  - [ ] Click "Request Code"
  - [ ] Check email for verification code
  - [ ] Enter verification code
  - [ ] Verify successful upgrade
  - [ ] Check localStorage for token and removal of `publicUserGuid`
- [ ] Test with phone:
  - [ ] Enter valid phone number
  - [ ] Verify "Request Code" button is enabled
  - [ ] Click "Request Code"
  - [ ] Check phone for verification code
  - [ ] Enter verification code
  - [ ] Verify successful upgrade
  - [ ] Check localStorage for token and removal of `publicUserGuid`

### 1.3 Error Cases for Anonymous Upgrade

- [ ] Test invalid email format
- [ ] Test invalid phone format
- [ ] Test expired verification code
- [ ] Test incorrect verification code
- [ ] Test changing contact information after requesting code
- [ ] Test multiple code requests for same contact

## 2. Authentication Routes

### 2.1 Request Verification Code

- [ ] Test `/auth/request-verification` with email
- [ ] Test `/auth/request-verification` with phone
- [ ] Verify rate limiting (if implemented)
- [ ] Test with invalid contact formats
- [ ] Test with non-existent contact

### 2.2 Verify Code

- [ ] Test `/auth/verify` with valid code
- [ ] Test `/auth/verify` with invalid code
- [ ] Test `/auth/verify` with expired code
- [ ] Test `/auth/verify` with wrong contact
- [ ] Verify token generation and storage

### 2.3 Get Current User

- [ ] Test `/auth/me` with valid token
- [ ] Test `/auth/me` with invalid token
- [ ] Test `/auth/me` with expired token
- [ ] Verify user data in response

### 2.4 Logout

- [ ] Test `/auth/logout` with valid token
- [ ] Verify token removal from localStorage
- [ ] Verify user state reset
- [ ] Verify redirect to appropriate page

## 3. User Settings

### 3.1 Update User

- [ ] Test updating name
- [ ] Test updating email
- [ ] Test updating phone
- [ ] Verify changes persist after refresh
- [ ] Test with invalid data formats

### 3.2 Change Contact Information

- [ ] Test changing email
- [ ] Test changing phone
- [ ] Verify verification flow for new contact
- [ ] Test reverting changes

## 4. Security Testing

### 4.1 Token Management

- [ ] Test token expiration
- [ ] Test token refresh
- [ ] Test multiple device login
- [ ] Test concurrent sessions

### 4.2 Rate Limiting

- [ ] Test verification code request limits
- [ ] Test login attempt limits
- [ ] Test password reset request limits

### 4.3 Session Management

- [ ] Test session timeout
- [ ] Test "Remember Me" functionality
- [ ] Test session invalidation on password change
- [ ] Test session invalidation on contact change

## 5. Edge Cases

### 5.1 Network Issues

- [ ] Test behavior with slow network
- [ ] Test behavior with no network
- [ ] Test recovery after network restoration

### 5.2 Browser Storage

- [ ] Test with localStorage disabled
- [ ] Test with cookies disabled
- [ ] Test with private browsing

### 5.3 Multiple Tabs

- [ ] Test authentication state across tabs
- [ ] Test logout from one tab
- [ ] Test session expiration across tabs

## 6. Integration Testing

### 6.1 Protected Routes

- [ ] Test access to protected routes with valid token
- [ ] Test access to protected routes with invalid token
- [ ] Test access to protected routes with no token
- [ ] Verify redirect behavior

### 6.2 Public Routes

- [ ] Test access to public routes with valid token
- [ ] Test access to public routes with invalid token
- [ ] Test access to public routes with no token

## Notes

- Document any unexpected behavior
- Note any UI/UX issues
- Record response times
- Document error messages
- Note any security concerns

## Test Environment

- Browser: [Specify browser and version]
- Device: [Specify device type]
- Network: [Specify network conditions]
- Date: [Specify test date]
- Tester: [Specify tester name]
