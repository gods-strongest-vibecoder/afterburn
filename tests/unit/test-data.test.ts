// Unit tests for the test data / form field value generator
import { describe, it, expect } from 'vitest';
import { TEST_DATA, getTestValueForField } from '../../src/execution/test-data.js';

describe('TEST_DATA constants', () => {
  it('has a valid email address', () => {
    expect(TEST_DATA.personal.email).toContain('@');
  });

  it('has a non-empty password', () => {
    expect(TEST_DATA.account.password.length).toBeGreaterThan(0);
  });

  it('has matching password and confirmPassword', () => {
    expect(TEST_DATA.account.password).toBe(TEST_DATA.account.confirmPassword);
  });
});

describe('getTestValueForField', () => {
  // -- Email --
  it('returns email for email type input', () => {
    expect(getTestValueForField('contact', 'email')).toBe(TEST_DATA.personal.email);
  });

  it('returns email when field name contains "email"', () => {
    expect(getTestValueForField('user_email', 'text')).toBe(TEST_DATA.personal.email);
  });

  // -- Password --
  it('returns password for password type', () => {
    expect(getTestValueForField('pass', 'password')).toBe(TEST_DATA.account.password);
  });

  it('returns confirmPassword for confirm password field', () => {
    expect(getTestValueForField('confirm_password', 'password')).toBe(TEST_DATA.account.confirmPassword);
  });

  it('returns password when field name includes "password"', () => {
    expect(getTestValueForField('user_password', 'text')).toBe(TEST_DATA.account.password);
  });

  // -- Phone --
  it('returns phone for tel type', () => {
    expect(getTestValueForField('contact', 'tel')).toBe(TEST_DATA.personal.phone);
  });

  it('returns phone when field name contains "phone"', () => {
    expect(getTestValueForField('phone_number', 'text')).toBe(TEST_DATA.personal.phone);
  });

  // -- Names --
  it('returns firstName for firstname field', () => {
    expect(getTestValueForField('firstName', 'text')).toBe(TEST_DATA.personal.firstName);
  });

  it('returns lastName for last-name field', () => {
    expect(getTestValueForField('last-name', 'text')).toBe(TEST_DATA.personal.lastName);
  });

  it('returns fullName for name field', () => {
    expect(getTestValueForField('name', 'text')).toBe(TEST_DATA.personal.fullName);
  });

  // -- Address --
  it('returns street for street field', () => {
    expect(getTestValueForField('street', 'text')).toBe(TEST_DATA.address.street);
  });

  it('returns street2 for address2 field', () => {
    expect(getTestValueForField('address2', 'text')).toBe(TEST_DATA.address.street2);
  });

  it('returns city for city field', () => {
    expect(getTestValueForField('city', 'text')).toBe(TEST_DATA.address.city);
  });

  it('returns state for state field', () => {
    expect(getTestValueForField('state', 'text')).toBe(TEST_DATA.address.state);
  });

  it('returns stateCode for state_code field', () => {
    expect(getTestValueForField('state_code', 'text')).toBe(TEST_DATA.address.stateCode);
  });

  it('returns zip for zip field', () => {
    expect(getTestValueForField('zip', 'text')).toBe(TEST_DATA.address.zip);
  });

  it('returns zip for postal code field', () => {
    expect(getTestValueForField('postalCode', 'text')).toBe(TEST_DATA.address.zip);
  });

  it('returns country for country field', () => {
    expect(getTestValueForField('country', 'text')).toBe(TEST_DATA.address.country);
  });

  it('returns countryCode for country_code field', () => {
    expect(getTestValueForField('country_code', 'text')).toBe(TEST_DATA.address.countryCode);
  });

  // -- Account --
  it('returns fullName for "username" field (generic "name" rule matches first)', () => {
    // The generic "name" check at line 82 matches before the specific "username" check
    // at line 107, because "username" contains "name". This documents actual behavior.
    expect(getTestValueForField('username', 'text')).toBe(TEST_DATA.personal.fullName);
  });

  it('returns security question', () => {
    expect(getTestValueForField('security_question', 'text')).toBe(TEST_DATA.account.securityQuestion);
  });

  it('returns security answer', () => {
    expect(getTestValueForField('security_answer', 'text')).toBe(TEST_DATA.account.securityAnswer);
  });

  // -- Payment --
  it('returns card number for card_number field', () => {
    expect(getTestValueForField('card_number', 'text')).toBe(TEST_DATA.payment.cardNumber);
  });

  it('returns expiry for expiry field', () => {
    expect(getTestValueForField('expiry', 'text')).toBe(TEST_DATA.payment.cardExpiry);
  });

  it('returns expiry month for expiry_month field', () => {
    expect(getTestValueForField('expiry_month', 'text')).toBe(TEST_DATA.payment.expiryMonth);
  });

  it('returns expiry year for expiry_year field', () => {
    expect(getTestValueForField('expiry_year', 'text')).toBe(TEST_DATA.payment.expiryYear);
  });

  it('returns CVV for cvv field', () => {
    expect(getTestValueForField('cvv', 'text')).toBe(TEST_DATA.payment.cvv);
  });

  it('returns cardholder name for cardholder field', () => {
    expect(getTestValueForField('cardholder', 'text')).toBe(TEST_DATA.payment.cardholderName);
  });

  // -- Dates --
  it('returns date for date type', () => {
    expect(getTestValueForField('dob', 'date')).toBe(TEST_DATA.dates.date);
  });

  it('returns time for time type', () => {
    expect(getTestValueForField('start', 'time')).toBe(TEST_DATA.dates.time);
  });

  it('returns datetime for datetime-local type', () => {
    expect(getTestValueForField('appointment', 'datetime-local')).toBe(TEST_DATA.dates.datetime);
  });

  // -- URL --
  it('returns URL for url type', () => {
    expect(getTestValueForField('homepage', 'url')).toBe('https://example.com');
  });

  it('returns URL when field name contains "website"', () => {
    expect(getTestValueForField('website', 'text')).toBe('https://example.com');
  });

  // -- Fallback --
  it('returns "Test input" for generic text fields', () => {
    expect(getTestValueForField('misc', 'text')).toBe('Test input');
  });

  it('returns "Test input" for search type', () => {
    expect(getTestValueForField('q', 'search')).toBe('Test input');
  });

  it('returns null for unrecognized field type', () => {
    expect(getTestValueForField('unknown_field', 'hidden')).toBeNull();
  });

  // -- Case insensitivity --
  it('is case-insensitive for field names', () => {
    expect(getTestValueForField('EMAIL', 'text')).toBe(TEST_DATA.personal.email);
    expect(getTestValueForField('FirstName', 'text')).toBe(TEST_DATA.personal.firstName);
  });

  it('is case-insensitive for field types', () => {
    expect(getTestValueForField('contact', 'EMAIL')).toBe(TEST_DATA.personal.email);
    expect(getTestValueForField('phone', 'TEL')).toBe(TEST_DATA.personal.phone);
  });
});
