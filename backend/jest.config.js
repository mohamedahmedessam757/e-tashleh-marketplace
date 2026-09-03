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
        '**/chat-completion-lock.util.spec.ts',
        '**/warranty-activation.util.spec.ts',
        '**/escrow-release-eligibility.util.spec.ts',
        '**/whatsapp-notification.mapper.spec.ts',
        '**/shipment-follow-url.util.spec.ts',
        '**/deep-link-token.util.spec.ts',
        '**/template-registry.spec.ts',
        '**/fee-settlement-plan.util.spec.ts',
        '**/adjudication-financial.util.spec.ts',
        '**/invoice-visibility.util.spec.ts',
        '**/refund-invoice.util.spec.ts',
        '**/returns-fee-invoice.service.spec.ts',
        '**/financial-report-export.util.spec.ts',
        '**/customer-wallet-metrics.util.spec.ts',
        '**/merchant-wallet-metrics.util.spec.ts',
        '**/admin-financial-metrics.util.spec.ts',
        '**/gateway-fee.util.spec.ts',
        '**/otp-purpose.spec.ts',
        '**/offer-action-policy.util.spec.ts',
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
