// projectRules.js
export const CONTRACT_FIELDS = {
    CIVILIAN: {
        required: ["ownerEntity"],
        forbidden: [
            "estimatedCost",
            "securityApprovalFile",
            "networkBudgetFile",
            "fiscalYear"
        ]
    },

    MILITARY: {
        required: [
            "estimatedCost.value",
            "estimatedCost.file",
            "securityApprovalFile"
        ],
        forbidden: [
            "ownerEntity",
            "fiscalYear"
        ]
    },

    BUDGET: {
        required: [
            "estimatedCost.value",
            "estimatedCost.file",
            "securityApprovalFile",
            "fiscalYear",
            "networkBudgetFile"
        ],
        forbidden: [
            "ownerEntity"
        ]
    }
};

// Function to reset forbidden fields
export function resetForbiddenFields(doc, forbiddenFields) {
    forbiddenFields.forEach(field => {
        const parts = field.split(".");
        let ref = doc;

        while (parts.length > 1) {
            ref = ref?.[parts.shift()];
        }

        if (ref) ref[parts[0]] = undefined;
    });
}

// Function to validate required fields
export function validateContractPayload(contractingParty, payload) {
    const rules = CONTRACT_FIELDS[contractingParty];

    for (const field of rules.required) {
        const value = field.split(".")
            .reduce((acc, key) => acc?.[key], payload);

        if (value === undefined || value === null) {
            throw new Error(`Field "${field}" is required for ${contractingParty}`);
        }
    }
}