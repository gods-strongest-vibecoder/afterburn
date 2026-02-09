/**
 * Predefined test data for reproducible form filling
 */
export declare const TEST_DATA: {
    readonly personal: {
        readonly firstName: "John";
        readonly lastName: "Doe";
        readonly fullName: "John Doe";
        readonly email: "test@example.com";
        readonly phone: "555-0100";
        readonly phoneFormatted: "(555) 010-0100";
    };
    readonly address: {
        readonly street: "123 Test Street";
        readonly street2: "Apt 4B";
        readonly city: "Testville";
        readonly state: "California";
        readonly stateCode: "CA";
        readonly zip: "90210";
        readonly zipCode: "90210";
        readonly postalCode: "90210";
        readonly country: "United States";
        readonly countryCode: "US";
    };
    readonly account: {
        readonly username: "testuser";
        readonly password: "Test1234!";
        readonly confirmPassword: "Test1234!";
        readonly securityQuestion: "What is your favorite color?";
        readonly securityAnswer: "Blue";
    };
    readonly payment: {
        readonly cardNumber: "4242424242424242";
        readonly cardExpiry: "12/34";
        readonly expiryMonth: "12";
        readonly expiryYear: "2034";
        readonly cardCVV: "123";
        readonly cvv: "123";
        readonly cardholderName: "John Doe";
    };
    readonly dates: {
        readonly date: "2020-02-02";
        readonly time: "13:15";
        readonly datetime: "2020-02-02T13:15";
    };
};
/**
 * Map field name/type to appropriate test data value
 */
export declare function getTestValueForField(fieldName: string, fieldType: string): string | null;
