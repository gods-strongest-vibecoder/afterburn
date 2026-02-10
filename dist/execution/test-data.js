// Fixed test data constants for form filling and workflow execution
/**
 * Predefined test data for reproducible form filling
 */
export const TEST_DATA = {
    personal: {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'test@example.com',
        phone: '555-0100',
        phoneFormatted: '(555) 010-0100',
    },
    address: {
        street: '123 Test Street',
        street2: 'Apt 4B',
        city: 'Testville',
        state: 'California',
        stateCode: 'CA',
        zip: '90210',
        zipCode: '90210',
        postalCode: '90210',
        country: 'United States',
        countryCode: 'US',
    },
    account: {
        username: 'testuser',
        password: 'Test1234!',
        confirmPassword: 'Test1234!',
        securityQuestion: 'What is your favorite color?',
        securityAnswer: 'Blue',
    },
    payment: {
        cardNumber: '4242424242424242',
        cardExpiry: '12/34',
        expiryMonth: '12',
        expiryYear: '2034',
        cardCVV: '123',
        cvv: '123',
        cardholderName: 'John Doe',
    },
    dates: {
        date: '2020-02-02',
        time: '13:15',
        datetime: '2020-02-02T13:15',
    },
};
/**
 * Map field name/type to appropriate test data value
 */
export function getTestValueForField(fieldName, fieldType) {
    const lowerName = fieldName.toLowerCase();
    const lowerType = fieldType.toLowerCase();
    // Email fields
    if (lowerType === 'email' || lowerName.includes('email')) {
        return TEST_DATA.personal.email;
    }
    // Password fields
    if (lowerType === 'password' || lowerName.includes('password')) {
        if (lowerName.includes('confirm')) {
            return TEST_DATA.account.confirmPassword;
        }
        return TEST_DATA.account.password;
    }
    // Phone fields
    if (lowerType === 'tel' || lowerName.includes('phone') || lowerName.includes('tel')) {
        return TEST_DATA.personal.phone;
    }
    // Name fields
    if (lowerName.includes('firstname') || lowerName.includes('first-name') || lowerName.includes('first_name')) {
        return TEST_DATA.personal.firstName;
    }
    if (lowerName.includes('lastname') || lowerName.includes('last-name') || lowerName.includes('last_name')) {
        return TEST_DATA.personal.lastName;
    }
    if (lowerName.includes('fullname') || lowerName.includes('full-name') || lowerName.includes('name')) {
        return TEST_DATA.personal.fullName;
    }
    // Address fields
    if (lowerName.includes('street') || lowerName.includes('address1') || lowerName.includes('address-1')) {
        return TEST_DATA.address.street;
    }
    if (lowerName.includes('address2') || lowerName.includes('address-2') || lowerName.includes('apt') || lowerName.includes('suite')) {
        return TEST_DATA.address.street2;
    }
    if (lowerName.includes('city')) {
        return TEST_DATA.address.city;
    }
    if (lowerName.includes('state') && !lowerName.includes('country')) {
        return lowerName.includes('code') ? TEST_DATA.address.stateCode : TEST_DATA.address.state;
    }
    if (lowerName.includes('zip') || lowerName.includes('postal')) {
        return TEST_DATA.address.zip;
    }
    if (lowerName.includes('country')) {
        return lowerName.includes('code') ? TEST_DATA.address.countryCode : TEST_DATA.address.country;
    }
    // Account fields
    if (lowerName.includes('username') || lowerName.includes('user-name')) {
        return TEST_DATA.account.username;
    }
    if (lowerName.includes('security') && lowerName.includes('question')) {
        return TEST_DATA.account.securityQuestion;
    }
    if (lowerName.includes('security') && lowerName.includes('answer')) {
        return TEST_DATA.account.securityAnswer;
    }
    // Payment fields
    if (lowerName.includes('card') && (lowerName.includes('number') || lowerName.includes('num'))) {
        return TEST_DATA.payment.cardNumber;
    }
    if (lowerName.includes('expir') || lowerName.includes('expiry')) {
        if (lowerName.includes('month')) {
            return TEST_DATA.payment.expiryMonth;
        }
        if (lowerName.includes('year')) {
            return TEST_DATA.payment.expiryYear;
        }
        return TEST_DATA.payment.cardExpiry;
    }
    if (lowerName.includes('cvv') || lowerName.includes('cvc') || lowerName.includes('security-code')) {
        return TEST_DATA.payment.cvv;
    }
    if (lowerName.includes('cardholder') || (lowerName.includes('card') && lowerName.includes('name'))) {
        return TEST_DATA.payment.cardholderName;
    }
    // Date/time fields
    if (lowerType === 'date' || lowerName.includes('date')) {
        return TEST_DATA.dates.date;
    }
    if (lowerType === 'time' || lowerName.includes('time')) {
        return TEST_DATA.dates.time;
    }
    if (lowerType === 'datetime-local' || lowerName.includes('datetime')) {
        return TEST_DATA.dates.datetime;
    }
    // URL fields
    if (lowerType === 'url' || lowerName.includes('url') || lowerName.includes('website')) {
        return 'https://example.com';
    }
    // Textarea fields
    if (lowerType === 'textarea') {
        return 'This is a test message for the form.';
    }
    // Number fields
    if (lowerType === 'number' || lowerType === 'range') {
        return '5';
    }
    // Generic text input (fallback)
    if (lowerType === 'text' || lowerType === 'search') {
        return 'Test input';
    }
    // Hidden/submit/button/file — skip these intentionally
    if (['hidden', 'submit', 'button', 'file', 'image', 'reset'].includes(lowerType)) {
        return null;
    }
    // Fallback for any other fillable input type
    return 'Test input';
}
//# sourceMappingURL=test-data.js.map