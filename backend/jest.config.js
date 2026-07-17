/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/offer-resolution.helpers.spec.ts',
        '**/gulf-phone.util.spec.ts',
        '**/widers-template-components.util.spec.ts',
        '**/invoice-snapshot.util.spec.ts',
    ],
    moduleNameMapper: {
        '^@prisma/client$': '<rootDir>/src/prisma/client',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.spec.json',
            },
        ],
    },
};
