export interface paths {
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["session"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["overview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/purposes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_purposes"];
        put?: never;
        post: operations["create_purposes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_notices"];
        put?: never;
        post: operations["create_notices"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/policies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_policies"];
        put?: never;
        post: operations["create_policies"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/systems": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_systems"];
        put?: never;
        post: operations["create_systems"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/principals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_principals"];
        put?: never;
        post: operations["create_principals"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/policies/{id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["publish_policy"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/control-map": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["control_map"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/systems/{id}/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["check_system"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/portal/me/consents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["own_consents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/portal/me/consents/{purpose_id}/grant": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["grant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/portal/me/consents/{purpose_id}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["withdraw"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/portal/me/receipts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["own_receipt"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/workflows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workflows"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/workflows/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workflow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/actions/{id}/reconcile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reconcile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/manual-tasks/{id}/attest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["attest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/failures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["failures"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/evidence/{workflow_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["evidence"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/evidence/{workflow_id}/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/policy/evaluate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["evaluate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/test-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["start_test"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/test-runs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["test_run"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["capabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/commands/poll": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["poll_commands"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/commands/{id}/receipts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["command_receipt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/simulator/send": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["send"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/simulator/resources/{id}/restrict": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["restrict"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/simulator/resources/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["read_simulator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/machine/simulator/receipts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["read_simulator_receipt"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ErrorResponse: {
            error: {
                /** @enum {string} */
                code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "EPOCH_CONFLICT" | "IDEMPOTENCY_CONFLICT" | "RATE_LIMITED" | "SERVICE_UNAVAILABLE" | "UNSUPPORTED_VERSION" | "STALE_GENERATION" | "INVALID_COMMAND";
                message: string;
                /** @enum {string} */
                retry: "NEVER" | "REAUTHENTICATE" | "REFRESH" | "SAME_IDEMPOTENCY_KEY" | "AFTER_DELAY";
                field_errors?: {
                    field: string;
                    code: string;
                }[];
            };
            /** Format: uuid */
            request_id: string;
        };
        Pagination: {
            cursor?: string;
            /** @default 25 */
            limit: number;
        };
        Session: {
            /** @constant */
            actor_domain: "STAFF";
            /** Format: uuid */
            actor_id: string;
            scope: {
                /** Format: uuid */
                tenant_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                /** Format: uuid */
                environment_id: string;
            };
            /** @enum {string} */
            role: "ORG_SUPER_ADMIN" | "ORG_ADMIN" | "MEMBER" | "AUDITOR";
            capabilities: ("overview.read" | "configuration.read" | "configuration.write" | "policy.publish" | "systems.check" | "principals.read" | "principals.create" | "workflow.read" | "action.reconcile" | "manual.attest" | "evidence.read" | "evidence.export" | "policy.preview" | "tests.run" | "tests.read" | "capabilities.read" | "consent.own.read" | "consent.own.write" | "receipt.own.read" | "health.read")[];
            mfa_verified: boolean;
            /** Format: date-time */
            expires_at: string;
        } | {
            /** @constant */
            actor_domain: "PRINCIPAL";
            /** Format: uuid */
            actor_id: string;
            /** Format: uuid */
            principal_id: string;
            scope: {
                /** Format: uuid */
                tenant_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                /** Format: uuid */
                environment_id: string;
            };
            /** @constant */
            role: "DATA_PRINCIPAL";
            capabilities: ("consent.own.read" | "consent.own.write" | "receipt.own.read")[];
            /** Format: date-time */
            expires_at: string;
        };
        Grant: {
            expected_epoch: number;
            /** Format: uuid */
            notice_version_id: string;
            /** Format: uuid */
            interaction_id: string;
            /** @constant */
            affirmative: true;
        };
        Withdraw: {
            expected_epoch: number;
            /** Format: uuid */
            interaction_id: string;
        };
        Receipt: {
            /** Format: uuid */
            receipt_id: string;
            /** Format: uuid */
            event_id: string;
            /** Format: uuid */
            purpose_id: string;
            /** @enum {string} */
            consent_status: "GRANTED" | "WITHDRAWN";
            consent_epoch: number;
            /** Format: date-time */
            accepted_at: string;
            workflow_id: string | null;
            /** @enum {string} */
            propagation_status: "ACCEPTED" | "NOT_REQUIRED";
        };
        ReceiptView: {
            receipt: {
                /** Format: uuid */
                receipt_id: string;
                /** Format: uuid */
                event_id: string;
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                consent_status: "GRANTED" | "WITHDRAWN";
                consent_epoch: number;
                /** Format: date-time */
                accepted_at: string;
                workflow_id: string | null;
                /** @enum {string} */
                propagation_status: "ACCEPTED" | "NOT_REQUIRED";
            };
            current: {
                /** @enum {string} */
                consent_status: "NOT_GIVEN" | "GRANTED" | "WITHDRAWN";
                consent_epoch: number;
                /** @enum {string} */
                propagation_status: "ACCEPTED" | "RUNNING" | "NEEDS_ATTENTION" | "COMPLETED" | "NOT_REQUIRED";
                /** Format: date-time */
                as_of: string;
            };
        };
        PurposeCreate: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            /** @enum {string} */
            code: "promotional_marketing" | "order_service_demo";
            name: string;
            description: string;
        };
        Purpose: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            /** @enum {string} */
            code: "promotional_marketing" | "order_service_demo";
            name: string;
            description: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            version_id: string;
            version: number;
            /** @enum {string} */
            status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
        };
        NoticeCreate: {
            /** Format: uuid */
            purpose_id: string;
            /** @enum {string} */
            language: "en";
            title: string;
            content: string;
        };
        Notice: {
            /** Format: uuid */
            purpose_id: string;
            /** @enum {string} */
            language: "en";
            title: string;
            content: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            version_id: string;
            content_digest: string;
            published_at: string | null;
        };
        PolicyCreate: {
            /** Format: uuid */
            purpose_id: string;
            /** Format: uuid */
            notice_version_id: string;
            /** @enum {string} */
            condition: "AFFIRMATIVE_MARKETING_CONSENT" | "APPROVED_SYNTHETIC_ORDER_SERVICE";
            system_ids: string[];
            required_observation: boolean;
        };
        Policy: {
            /** Format: uuid */
            purpose_id: string;
            /** Format: uuid */
            notice_version_id: string;
            /** @enum {string} */
            condition: "AFFIRMATIVE_MARKETING_CONSENT" | "APPROVED_SYNTHETIC_ORDER_SERVICE";
            system_ids: string[];
            required_observation: boolean;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            version_id: string;
            digest: string;
            /** Format: uuid */
            author_id: string;
            /** @enum {string} */
            status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
            published_at: string | null;
        };
        PolicyPublish: {
            /** Format: uuid */
            version_id: string;
            digest: string;
            /** Format: uuid */
            reauthentication_id: string;
        };
        SystemCreate: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            name: string;
            /** @enum {string} */
            connector: "SYNTHETIC_CRM" | "ORVIA_REST_SIMULATOR" | "LEGACY_MANUAL";
        };
        System: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            name: string;
            /** @enum {string} */
            connector: "SYNTHETIC_CRM" | "ORVIA_REST_SIMULATOR" | "LEGACY_MANUAL";
            /** Format: uuid */
            id: string;
            capability_version: string;
            supports_restrict: boolean;
            supports_read: boolean;
            checked_at: string | null;
        };
        PrincipalCreate: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            display_name: string;
            email: string & (unknown & unknown);
        };
        Principal: {
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            display_name: string;
            email: string & (unknown & unknown);
            /** Format: uuid */
            id: string;
            /** @constant */
            synthetic: true;
        };
        ConsentChoice: {
            /** Format: uuid */
            purpose_id: string;
            purpose_name: string;
            /** @enum {string} */
            consent_status: "NOT_GIVEN" | "GRANTED" | "WITHDRAWN";
            consent_epoch: number;
            notice: {
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                language: "en";
                title: string;
                content: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                version_id: string;
                content_digest: string;
                published_at: string | null;
            } | null;
            /** Format: uuid */
            interaction_id: string;
        };
        CommandScope: {
            /** Format: uuid */
            tenant_id: string;
            /** Format: uuid */
            legal_entity_id: string;
            /** Format: uuid */
            environment_id: string;
            /** Format: uuid */
            principal_reference_id: string;
            /** Format: uuid */
            system_id: string;
            /** Format: uuid */
            resource_id: string;
            target_subject_reference: string;
            /** Format: uuid */
            purpose_id: string;
            /** Format: uuid */
            policy_version_id: string;
            consent_epoch: number;
            target_generation: number;
            /** @enum {string} */
            operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
        };
        Approval: {
            /** @constant */
            result: "APPROVED";
            /** Format: uuid */
            decision_id: string;
            /** Format: uuid */
            reviewer_id: string;
            /** Format: uuid */
            author_id: string;
            approved_plan_digest: string;
            /** Format: uuid */
            policy_version_id: string;
            /** Format: date-time */
            decided_at: string;
        } | {
            /** @constant */
            result: "NOT_REQUIRED_BY_POLICY";
            /** Format: uuid */
            decision_id: string;
            /** Format: uuid */
            policy_version_id: string;
            approved_plan_digest: string;
            /** @constant */
            rule_id: "SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION";
            /** Format: date-time */
            decided_at: string;
        };
        PlanBinding: {
            /** Format: uuid */
            workflow_id: string;
            /** Format: uuid */
            action_id: string;
            scope: {
                /** Format: uuid */
                tenant_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                /** Format: uuid */
                environment_id: string;
                /** Format: uuid */
                principal_reference_id: string;
                /** Format: uuid */
                system_id: string;
                /** Format: uuid */
                resource_id: string;
                target_subject_reference: string;
                /** Format: uuid */
                purpose_id: string;
                /** Format: uuid */
                policy_version_id: string;
                consent_epoch: number;
                target_generation: number;
                /** @enum {string} */
                operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
            };
            /** @constant */
            capability: "restrict_exact_synthetic_subject";
            capability_version: string;
            operation_budget: {
                /** @constant */
                maximum_records: 1;
                maximum_attempts: number;
            };
        };
        CommandPayload: {
            /** @constant */
            schema_version: "0.2.1";
            /** Format: uuid */
            command_id: string;
            /** Format: uuid */
            installation_id: string;
            /** Format: uuid */
            signing_key_id: string;
            binding: {
                /** Format: uuid */
                workflow_id: string;
                /** Format: uuid */
                action_id: string;
                scope: {
                    /** Format: uuid */
                    tenant_id: string;
                    /** Format: uuid */
                    legal_entity_id: string;
                    /** Format: uuid */
                    environment_id: string;
                    /** Format: uuid */
                    principal_reference_id: string;
                    /** Format: uuid */
                    system_id: string;
                    /** Format: uuid */
                    resource_id: string;
                    target_subject_reference: string;
                    /** Format: uuid */
                    purpose_id: string;
                    /** Format: uuid */
                    policy_version_id: string;
                    consent_epoch: number;
                    target_generation: number;
                    /** @enum {string} */
                    operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                };
                /** @constant */
                capability: "restrict_exact_synthetic_subject";
                capability_version: string;
                operation_budget: {
                    /** @constant */
                    maximum_records: 1;
                    maximum_attempts: number;
                };
            };
            scope_digest: string;
            plan_digest: string;
            approval: {
                /** @constant */
                result: "APPROVED";
                /** Format: uuid */
                decision_id: string;
                /** Format: uuid */
                reviewer_id: string;
                /** Format: uuid */
                author_id: string;
                approved_plan_digest: string;
                /** Format: uuid */
                policy_version_id: string;
                /** Format: date-time */
                decided_at: string;
            } | {
                /** @constant */
                result: "NOT_REQUIRED_BY_POLICY";
                /** Format: uuid */
                decision_id: string;
                /** Format: uuid */
                policy_version_id: string;
                approved_plan_digest: string;
                /** @constant */
                rule_id: "SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION";
                /** Format: date-time */
                decided_at: string;
            };
            approval_digest: string;
            /** Format: date-time */
            issued_at: string;
            /** Format: date-time */
            expires_at: string;
            nonce: string;
        };
        SignedCommand: {
            /** @constant */
            algorithm: "Ed25519";
            payload: {
                /** @constant */
                schema_version: "0.2.1";
                /** Format: uuid */
                command_id: string;
                /** Format: uuid */
                installation_id: string;
                /** Format: uuid */
                signing_key_id: string;
                binding: {
                    /** Format: uuid */
                    workflow_id: string;
                    /** Format: uuid */
                    action_id: string;
                    scope: {
                        /** Format: uuid */
                        tenant_id: string;
                        /** Format: uuid */
                        legal_entity_id: string;
                        /** Format: uuid */
                        environment_id: string;
                        /** Format: uuid */
                        principal_reference_id: string;
                        /** Format: uuid */
                        system_id: string;
                        /** Format: uuid */
                        resource_id: string;
                        target_subject_reference: string;
                        /** Format: uuid */
                        purpose_id: string;
                        /** Format: uuid */
                        policy_version_id: string;
                        consent_epoch: number;
                        target_generation: number;
                        /** @enum {string} */
                        operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                    };
                    /** @constant */
                    capability: "restrict_exact_synthetic_subject";
                    capability_version: string;
                    operation_budget: {
                        /** @constant */
                        maximum_records: 1;
                        maximum_attempts: number;
                    };
                };
                scope_digest: string;
                plan_digest: string;
                approval: {
                    /** @constant */
                    result: "APPROVED";
                    /** Format: uuid */
                    decision_id: string;
                    /** Format: uuid */
                    reviewer_id: string;
                    /** Format: uuid */
                    author_id: string;
                    approved_plan_digest: string;
                    /** Format: uuid */
                    policy_version_id: string;
                    /** Format: date-time */
                    decided_at: string;
                } | {
                    /** @constant */
                    result: "NOT_REQUIRED_BY_POLICY";
                    /** Format: uuid */
                    decision_id: string;
                    /** Format: uuid */
                    policy_version_id: string;
                    approved_plan_digest: string;
                    /** @constant */
                    rule_id: "SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION";
                    /** Format: date-time */
                    decided_at: string;
                };
                approval_digest: string;
                /** Format: date-time */
                issued_at: string;
                /** Format: date-time */
                expires_at: string;
                nonce: string;
            };
            signature: string;
        };
        CommandReceipt: {
            /** Format: uuid */
            command_id: string;
            command_digest: string;
            /** Format: uuid */
            attempt_id: string;
            /** @enum {string} */
            execution_state: "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED";
            /** Format: date-time */
            recorded_at: string;
            reason_code: string;
            target_generation: number;
        };
        Observation: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            action_id: string;
            /** Format: uuid */
            system_id: string;
            /** Format: uuid */
            resource_id: string;
            target_generation: number;
            /** @enum {string} */
            state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
            /** @enum {string} */
            method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
            observed_at: string | null;
            fresh_until: string | null;
            /** @constant */
            desired_state: "MARKETING_RESTRICTED";
            /** @enum {string} */
            observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
            limits: string[];
        };
        Reconciliation: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            action_id: string;
            /** Format: uuid */
            uncertain_attempt_id: string;
            /** @enum {string} */
            state: "PENDING" | "RECONCILING" | "RESOLVED" | "INCONCLUSIVE" | "FAILED";
            /** @enum {string} */
            method: "SCOPED_READ" | "PROVIDER_RECEIPT";
            started_at: string | null;
            finished_at: string | null;
            observation_id: string | null;
            reason_code: string | null;
        };
        ManualAttestation: {
            statement: string;
            evidence_record_ids: string[];
            expected_task_version: number;
        };
        Obligation: {
            /** Format: uuid */
            id: string;
            required: boolean;
            /**
             * @description CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.
             * @enum {string}
             */
            completion_criterion: "CURRENT_SCOPED_OBSERVATION" | "ATTRIBUTED_MANUAL_ATTESTATION";
            /** @enum {string} */
            execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
            observation: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                action_id: string;
                /** Format: uuid */
                system_id: string;
                /** Format: uuid */
                resource_id: string;
                target_generation: number;
                /** @enum {string} */
                state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                /** @enum {string} */
                method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                observed_at: string | null;
                fresh_until: string | null;
                /** @constant */
                desired_state: "MARKETING_RESTRICTED";
                /** @enum {string} */
                observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                limits: string[];
            } | null;
            attestation: {
                /** Format: uuid */
                actor_id: string;
                /** Format: date-time */
                recorded_at: string;
                statement: string;
                evidence_record_ids: string[];
            } | null;
            scope_still_current: boolean;
            skip_reason: string | null;
        };
        Action: {
            /** Format: uuid */
            id: string;
            plan: {
                /** Format: uuid */
                workflow_id: string;
                /** Format: uuid */
                action_id: string;
                scope: {
                    /** Format: uuid */
                    tenant_id: string;
                    /** Format: uuid */
                    legal_entity_id: string;
                    /** Format: uuid */
                    environment_id: string;
                    /** Format: uuid */
                    principal_reference_id: string;
                    /** Format: uuid */
                    system_id: string;
                    /** Format: uuid */
                    resource_id: string;
                    target_subject_reference: string;
                    /** Format: uuid */
                    purpose_id: string;
                    /** Format: uuid */
                    policy_version_id: string;
                    consent_epoch: number;
                    target_generation: number;
                    /** @enum {string} */
                    operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                };
                /** @constant */
                capability: "restrict_exact_synthetic_subject";
                capability_version: string;
                operation_budget: {
                    /** @constant */
                    maximum_records: 1;
                    maximum_attempts: number;
                };
            };
            /** @enum {string} */
            execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
            attempts: {
                /** Format: uuid */
                command_id: string;
                command_digest: string;
                /** Format: uuid */
                attempt_id: string;
                /** @enum {string} */
                execution_state: "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED";
                /** Format: date-time */
                recorded_at: string;
                reason_code: string;
                target_generation: number;
            }[];
            observations: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                action_id: string;
                /** Format: uuid */
                system_id: string;
                /** Format: uuid */
                resource_id: string;
                target_generation: number;
                /** @enum {string} */
                state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                /** @enum {string} */
                method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                observed_at: string | null;
                fresh_until: string | null;
                /** @constant */
                desired_state: "MARKETING_RESTRICTED";
                /** @enum {string} */
                observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                limits: string[];
            }[];
            reconciliations: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                action_id: string;
                /** Format: uuid */
                uncertain_attempt_id: string;
                /** @enum {string} */
                state: "PENDING" | "RECONCILING" | "RESOLVED" | "INCONCLUSIVE" | "FAILED";
                /** @enum {string} */
                method: "SCOPED_READ" | "PROVIDER_RECEIPT";
                started_at: string | null;
                finished_at: string | null;
                observation_id: string | null;
                reason_code: string | null;
            }[];
        };
        WorkflowSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            event_id: string;
            /** Format: uuid */
            purpose_id: string;
            /** @enum {string} */
            state: "ACCEPTED" | "RUNNING" | "NEEDS_ATTENTION" | "COMPLETED";
            /** Format: date-time */
            accepted_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        Workflow: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            event_id: string;
            /** Format: uuid */
            purpose_id: string;
            /** @enum {string} */
            state: "ACCEPTED" | "RUNNING" | "NEEDS_ATTENTION" | "COMPLETED";
            /** Format: date-time */
            accepted_at: string;
            /** Format: date-time */
            updated_at: string;
            actions: {
                /** Format: uuid */
                id: string;
                plan: {
                    /** Format: uuid */
                    workflow_id: string;
                    /** Format: uuid */
                    action_id: string;
                    scope: {
                        /** Format: uuid */
                        tenant_id: string;
                        /** Format: uuid */
                        legal_entity_id: string;
                        /** Format: uuid */
                        environment_id: string;
                        /** Format: uuid */
                        principal_reference_id: string;
                        /** Format: uuid */
                        system_id: string;
                        /** Format: uuid */
                        resource_id: string;
                        target_subject_reference: string;
                        /** Format: uuid */
                        purpose_id: string;
                        /** Format: uuid */
                        policy_version_id: string;
                        consent_epoch: number;
                        target_generation: number;
                        /** @enum {string} */
                        operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                    };
                    /** @constant */
                    capability: "restrict_exact_synthetic_subject";
                    capability_version: string;
                    operation_budget: {
                        /** @constant */
                        maximum_records: 1;
                        maximum_attempts: number;
                    };
                };
                /** @enum {string} */
                execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
                attempts: {
                    /** Format: uuid */
                    command_id: string;
                    command_digest: string;
                    /** Format: uuid */
                    attempt_id: string;
                    /** @enum {string} */
                    execution_state: "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED";
                    /** Format: date-time */
                    recorded_at: string;
                    reason_code: string;
                    target_generation: number;
                }[];
                observations: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    action_id: string;
                    /** Format: uuid */
                    system_id: string;
                    /** Format: uuid */
                    resource_id: string;
                    target_generation: number;
                    /** @enum {string} */
                    state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                    /** @enum {string} */
                    method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                    observed_at: string | null;
                    fresh_until: string | null;
                    /** @constant */
                    desired_state: "MARKETING_RESTRICTED";
                    /** @enum {string} */
                    observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                    limits: string[];
                }[];
                reconciliations: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    action_id: string;
                    /** Format: uuid */
                    uncertain_attempt_id: string;
                    /** @enum {string} */
                    state: "PENDING" | "RECONCILING" | "RESOLVED" | "INCONCLUSIVE" | "FAILED";
                    /** @enum {string} */
                    method: "SCOPED_READ" | "PROVIDER_RECEIPT";
                    started_at: string | null;
                    finished_at: string | null;
                    observation_id: string | null;
                    reason_code: string | null;
                }[];
            }[];
            obligations: {
                /** Format: uuid */
                id: string;
                required: boolean;
                /**
                 * @description CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.
                 * @enum {string}
                 */
                completion_criterion: "CURRENT_SCOPED_OBSERVATION" | "ATTRIBUTED_MANUAL_ATTESTATION";
                /** @enum {string} */
                execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
                observation: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    action_id: string;
                    /** Format: uuid */
                    system_id: string;
                    /** Format: uuid */
                    resource_id: string;
                    target_generation: number;
                    /** @enum {string} */
                    state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                    /** @enum {string} */
                    method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                    observed_at: string | null;
                    fresh_until: string | null;
                    /** @constant */
                    desired_state: "MARKETING_RESTRICTED";
                    /** @enum {string} */
                    observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                    limits: string[];
                } | null;
                attestation: {
                    /** Format: uuid */
                    actor_id: string;
                    /** Format: date-time */
                    recorded_at: string;
                    statement: string;
                    evidence_record_ids: string[];
                } | null;
                scope_still_current: boolean;
                skip_reason: string | null;
            }[];
        };
        AcceptedOperation: {
            /** Format: uuid */
            operation_id: string;
            /** @constant */
            status: "ACCEPTED";
            /** Format: date-time */
            accepted_at: string;
        };
        Evaluate: {
            /** Format: uuid */
            principal_id: string;
            /** Format: uuid */
            purpose_id: string;
            /** Format: uuid */
            system_id: string;
            /** @enum {string} */
            action: "MARKETING_SEND" | "ORDER_SERVICE_SEND";
        };
        Decision: {
            /** Format: uuid */
            decision_id: string;
            /** @enum {string} */
            decision: "ALLOW" | "BLOCK" | "INDETERMINATE";
            reason_codes: string[];
            policy_version_id: string | null;
            consent_epoch: number | null;
            /** @constant */
            preview_only: true;
            /** Format: date-time */
            evaluated_at: string;
        };
        SendRequest: {
            /** Format: uuid */
            attempt_id: string;
            /** Format: uuid */
            principal_reference_id: string;
            /** Format: uuid */
            purpose_id: string;
            /** Format: uuid */
            system_id: string;
            /** @enum {string} */
            message_class: "MARKETING" | "ORDER_SERVICE";
            order_reference: string | null;
        };
        SendResult: {
            /** Format: uuid */
            attempt_id: string;
            /** @enum {string} */
            decision: "ALLOW" | "BLOCK" | "INDETERMINATE";
            send_record_id: string | null;
            admitted_at: string | null;
            evaluated_epoch: number;
            reason_codes: string[];
        };
        SimulatorState: {
            /** Format: uuid */
            resource_id: string;
            generation: number;
            last_applied_epoch: number;
            marketing_restricted: boolean;
            /** Format: date-time */
            observed_at: string;
        };
        TestRunCreate: {
            /** @enum {string} */
            scenario: "MARKETING_WITHDRAWAL_HEALTHY" | "MARKETING_WITHDRAWAL_BROKEN_CONTROL" | "TARGET_RESTORE_QUARANTINE";
            /** @enum {string} */
            profile: "codex-a00" | "ui-b00" | "rehearsal";
            /** @constant */
            fixture_id: "aster-birch-v1";
        };
        TestRun: {
            /** Format: uuid */
            id: string;
            request: {
                /** @enum {string} */
                scenario: "MARKETING_WITHDRAWAL_HEALTHY" | "MARKETING_WITHDRAWAL_BROKEN_CONTROL" | "TARGET_RESTORE_QUARANTINE";
                /** @enum {string} */
                profile: "codex-a00" | "ui-b00" | "rehearsal";
                /** @constant */
                fixture_id: "aster-birch-v1";
            };
            /** @enum {string} */
            state: "NOT_RUN" | "RUNNING" | "PASS" | "FAIL" | "ERROR" | "SKIPPED";
            build_id: string;
            contract_version: string;
            started_at: string | null;
            finished_at: string | null;
            assertions: {
                id: string;
                /** @enum {string} */
                result: "PASS" | "FAIL" | "ERROR" | "SKIPPED";
                expected: string;
                actual: string;
                artifact_paths: string[];
            }[];
            expected_fault_detection: boolean;
        };
        CapabilityRecord: {
            code: string;
            /** @enum {string} */
            target_release: "V1" | "DEFERRED_V2";
            /** @enum {string} */
            implementation_status: "NOT_IMPLEMENTED" | "IMPLEMENTED";
            /** @enum {string} */
            test_status: "NOT_RUN" | "RUNNING" | "PASS" | "FAIL" | "ERROR" | "SKIPPED";
            /** @constant */
            supported_profile: "CUSTOMER_LOCAL_SYNTHETIC";
            limitations: string[];
        };
        Overview: {
            scope: {
                /** Format: uuid */
                tenant_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                /** Format: uuid */
                environment_id: string;
            };
            build_id: string;
            contract_version: string;
            /** @constant */
            profile: "CUSTOMER_LOCAL_SYNTHETIC";
            /** Format: date-time */
            as_of: string;
            counts: {
                accepted: number;
                running: number;
                needs_attention: number;
                completed: number;
                effect_unknown: number;
                manual_required: number;
                failed: number;
                unverified: number;
            };
        };
        Evidence: {
            workflow: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                event_id: string;
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                state: "ACCEPTED" | "RUNNING" | "NEEDS_ATTENTION" | "COMPLETED";
                /** Format: date-time */
                accepted_at: string;
                /** Format: date-time */
                updated_at: string;
                actions: {
                    /** Format: uuid */
                    id: string;
                    plan: {
                        /** Format: uuid */
                        workflow_id: string;
                        /** Format: uuid */
                        action_id: string;
                        scope: {
                            /** Format: uuid */
                            tenant_id: string;
                            /** Format: uuid */
                            legal_entity_id: string;
                            /** Format: uuid */
                            environment_id: string;
                            /** Format: uuid */
                            principal_reference_id: string;
                            /** Format: uuid */
                            system_id: string;
                            /** Format: uuid */
                            resource_id: string;
                            target_subject_reference: string;
                            /** Format: uuid */
                            purpose_id: string;
                            /** Format: uuid */
                            policy_version_id: string;
                            consent_epoch: number;
                            target_generation: number;
                            /** @enum {string} */
                            operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                        };
                        /** @constant */
                        capability: "restrict_exact_synthetic_subject";
                        capability_version: string;
                        operation_budget: {
                            /** @constant */
                            maximum_records: 1;
                            maximum_attempts: number;
                        };
                    };
                    /** @enum {string} */
                    execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
                    attempts: {
                        /** Format: uuid */
                        command_id: string;
                        command_digest: string;
                        /** Format: uuid */
                        attempt_id: string;
                        /** @enum {string} */
                        execution_state: "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED";
                        /** Format: date-time */
                        recorded_at: string;
                        reason_code: string;
                        target_generation: number;
                    }[];
                    observations: {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        action_id: string;
                        /** Format: uuid */
                        system_id: string;
                        /** Format: uuid */
                        resource_id: string;
                        target_generation: number;
                        /** @enum {string} */
                        state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                        /** @enum {string} */
                        method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                        observed_at: string | null;
                        fresh_until: string | null;
                        /** @constant */
                        desired_state: "MARKETING_RESTRICTED";
                        /** @enum {string} */
                        observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                        limits: string[];
                    }[];
                    reconciliations: {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        action_id: string;
                        /** Format: uuid */
                        uncertain_attempt_id: string;
                        /** @enum {string} */
                        state: "PENDING" | "RECONCILING" | "RESOLVED" | "INCONCLUSIVE" | "FAILED";
                        /** @enum {string} */
                        method: "SCOPED_READ" | "PROVIDER_RECEIPT";
                        started_at: string | null;
                        finished_at: string | null;
                        observation_id: string | null;
                        reason_code: string | null;
                    }[];
                }[];
                obligations: {
                    /** Format: uuid */
                    id: string;
                    required: boolean;
                    /**
                     * @description CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.
                     * @enum {string}
                     */
                    completion_criterion: "CURRENT_SCOPED_OBSERVATION" | "ATTRIBUTED_MANUAL_ATTESTATION";
                    /** @enum {string} */
                    execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
                    observation: {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        action_id: string;
                        /** Format: uuid */
                        system_id: string;
                        /** Format: uuid */
                        resource_id: string;
                        target_generation: number;
                        /** @enum {string} */
                        state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                        /** @enum {string} */
                        method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                        observed_at: string | null;
                        fresh_until: string | null;
                        /** @constant */
                        desired_state: "MARKETING_RESTRICTED";
                        /** @enum {string} */
                        observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                        limits: string[];
                    } | null;
                    attestation: {
                        /** Format: uuid */
                        actor_id: string;
                        /** Format: date-time */
                        recorded_at: string;
                        statement: string;
                        evidence_record_ids: string[];
                    } | null;
                    scope_still_current: boolean;
                    skip_reason: string | null;
                }[];
            };
            receipts: {
                /** Format: uuid */
                receipt_id: string;
                /** Format: uuid */
                event_id: string;
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                consent_status: "GRANTED" | "WITHDRAWN";
                consent_epoch: number;
                /** Format: date-time */
                accepted_at: string;
                workflow_id: string | null;
                /** @enum {string} */
                propagation_status: "ACCEPTED" | "NOT_REQUIRED";
            }[];
            policy_version_ids: string[];
            notice_version_ids: string[];
            tests: {
                /** Format: uuid */
                id: string;
                request: {
                    /** @enum {string} */
                    scenario: "MARKETING_WITHDRAWAL_HEALTHY" | "MARKETING_WITHDRAWAL_BROKEN_CONTROL" | "TARGET_RESTORE_QUARANTINE";
                    /** @enum {string} */
                    profile: "codex-a00" | "ui-b00" | "rehearsal";
                    /** @constant */
                    fixture_id: "aster-birch-v1";
                };
                /** @enum {string} */
                state: "NOT_RUN" | "RUNNING" | "PASS" | "FAIL" | "ERROR" | "SKIPPED";
                build_id: string;
                contract_version: string;
                started_at: string | null;
                finished_at: string | null;
                assertions: {
                    id: string;
                    /** @enum {string} */
                    result: "PASS" | "FAIL" | "ERROR" | "SKIPPED";
                    expected: string;
                    actual: string;
                    artifact_paths: string[];
                }[];
                expected_fault_detection: boolean;
            }[];
            /** Format: date-time */
            exported_at: string;
            coverage_limits: string[];
            integrity_digest: string;
            /** @constant */
            integrity_limit: "Digest detects change relative to a trusted reference; it does not prove external effects or prevent privileged rewriting.";
        };
        ControlMap: {
            edges: {
                /** Format: uuid */
                purpose_id: string;
                /** Format: uuid */
                system_id: string;
                /** Format: uuid */
                resource_id: string;
                capability_version: string;
                declared_restrict: boolean;
                observed_restrict: boolean | null;
                as_of: string | null;
            }[];
        };
        IdPath: {
            /** Format: uuid */
            id: string;
        };
        PurposePath: {
            /** Format: uuid */
            purpose_id: string;
        };
        WorkflowPath: {
            /** Format: uuid */
            workflow_id: string;
        };
        PollRequest: {
            /** Format: uuid */
            installation_id: string;
            /** Format: uuid */
            environment_id: string;
            maximum_commands: number;
        };
        PurposeList: {
            items: {
                /** Format: uuid */
                environment_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                /** @enum {string} */
                code: "promotional_marketing" | "order_service_demo";
                name: string;
                description: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                version_id: string;
                version: number;
                /** @enum {string} */
                status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
            }[];
            next_cursor: string | null;
        };
        NoticeList: {
            items: {
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                language: "en";
                title: string;
                content: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                version_id: string;
                content_digest: string;
                published_at: string | null;
            }[];
            next_cursor: string | null;
        };
        PolicyList: {
            items: {
                /** Format: uuid */
                purpose_id: string;
                /** Format: uuid */
                notice_version_id: string;
                /** @enum {string} */
                condition: "AFFIRMATIVE_MARKETING_CONSENT" | "APPROVED_SYNTHETIC_ORDER_SERVICE";
                system_ids: string[];
                required_observation: boolean;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                version_id: string;
                digest: string;
                /** Format: uuid */
                author_id: string;
                /** @enum {string} */
                status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
                published_at: string | null;
            }[];
            next_cursor: string | null;
        };
        SystemList: {
            items: {
                /** Format: uuid */
                environment_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                name: string;
                /** @enum {string} */
                connector: "SYNTHETIC_CRM" | "ORVIA_REST_SIMULATOR" | "LEGACY_MANUAL";
                /** Format: uuid */
                id: string;
                capability_version: string;
                supports_restrict: boolean;
                supports_read: boolean;
                checked_at: string | null;
            }[];
            next_cursor: string | null;
        };
        PrincipalList: {
            items: {
                /** Format: uuid */
                environment_id: string;
                /** Format: uuid */
                legal_entity_id: string;
                display_name: string;
                email: string & (unknown & unknown);
                /** Format: uuid */
                id: string;
                /** @constant */
                synthetic: true;
            }[];
            next_cursor: string | null;
        };
        ConsentList: {
            items: {
                /** Format: uuid */
                purpose_id: string;
                purpose_name: string;
                /** @enum {string} */
                consent_status: "NOT_GIVEN" | "GRANTED" | "WITHDRAWN";
                consent_epoch: number;
                notice: {
                    /** Format: uuid */
                    purpose_id: string;
                    /** @enum {string} */
                    language: "en";
                    title: string;
                    content: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    version_id: string;
                    content_digest: string;
                    published_at: string | null;
                } | null;
                /** Format: uuid */
                interaction_id: string;
            }[];
            next_cursor: string | null;
        };
        WorkflowList: {
            items: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                event_id: string;
                /** Format: uuid */
                purpose_id: string;
                /** @enum {string} */
                state: "ACCEPTED" | "RUNNING" | "NEEDS_ATTENTION" | "COMPLETED";
                /** Format: date-time */
                accepted_at: string;
                /** Format: date-time */
                updated_at: string;
            }[];
            next_cursor: string | null;
        };
        FailureList: {
            items: {
                /** Format: uuid */
                id: string;
                required: boolean;
                /**
                 * @description CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.
                 * @enum {string}
                 */
                completion_criterion: "CURRENT_SCOPED_OBSERVATION" | "ATTRIBUTED_MANUAL_ATTESTATION";
                /** @enum {string} */
                execution_state: "PENDING" | "RUNNING" | "ACKNOWLEDGED" | "EFFECT_UNKNOWN" | "FAILED" | "MANUAL_REQUIRED" | "SKIPPED";
                observation: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    action_id: string;
                    /** Format: uuid */
                    system_id: string;
                    /** Format: uuid */
                    resource_id: string;
                    target_generation: number;
                    /** @enum {string} */
                    state: "NOT_CHECKED" | "OBSERVED_SATISFIED" | "OBSERVED_NOT_SATISFIED" | "UNVERIFIABLE" | "STALE";
                    /** @enum {string} */
                    method: "SCOPED_READ" | "PROVIDER_RECEIPT" | "NONE";
                    observed_at: string | null;
                    fresh_until: string | null;
                    /** @constant */
                    desired_state: "MARKETING_RESTRICTED";
                    /** @enum {string} */
                    observed_state: "MARKETING_RESTRICTED" | "MARKETING_ENABLED" | "UNKNOWN";
                    limits: string[];
                } | null;
                attestation: {
                    /** Format: uuid */
                    actor_id: string;
                    /** Format: date-time */
                    recorded_at: string;
                    statement: string;
                    evidence_record_ids: string[];
                } | null;
                scope_still_current: boolean;
                skip_reason: string | null;
            }[];
            next_cursor: string | null;
        };
        CapabilityList: {
            items: {
                code: string;
                /** @enum {string} */
                target_release: "V1" | "DEFERRED_V2";
                /** @enum {string} */
                implementation_status: "NOT_IMPLEMENTED" | "IMPLEMENTED";
                /** @enum {string} */
                test_status: "NOT_RUN" | "RUNNING" | "PASS" | "FAIL" | "ERROR" | "SKIPPED";
                /** @constant */
                supported_profile: "CUSTOMER_LOCAL_SYNTHETIC";
                limitations: string[];
            }[];
            next_cursor: string | null;
        };
        CommandList: {
            commands: {
                /** @constant */
                algorithm: "Ed25519";
                payload: {
                    /** @constant */
                    schema_version: "0.2.1";
                    /** Format: uuid */
                    command_id: string;
                    /** Format: uuid */
                    installation_id: string;
                    /** Format: uuid */
                    signing_key_id: string;
                    binding: {
                        /** Format: uuid */
                        workflow_id: string;
                        /** Format: uuid */
                        action_id: string;
                        scope: {
                            /** Format: uuid */
                            tenant_id: string;
                            /** Format: uuid */
                            legal_entity_id: string;
                            /** Format: uuid */
                            environment_id: string;
                            /** Format: uuid */
                            principal_reference_id: string;
                            /** Format: uuid */
                            system_id: string;
                            /** Format: uuid */
                            resource_id: string;
                            target_subject_reference: string;
                            /** Format: uuid */
                            purpose_id: string;
                            /** Format: uuid */
                            policy_version_id: string;
                            consent_epoch: number;
                            target_generation: number;
                            /** @enum {string} */
                            operation: "CRM_REMOVE_MARKETING_MEMBERSHIP" | "SIMULATOR_RESTRICT";
                        };
                        /** @constant */
                        capability: "restrict_exact_synthetic_subject";
                        capability_version: string;
                        operation_budget: {
                            /** @constant */
                            maximum_records: 1;
                            maximum_attempts: number;
                        };
                    };
                    scope_digest: string;
                    plan_digest: string;
                    approval: {
                        /** @constant */
                        result: "APPROVED";
                        /** Format: uuid */
                        decision_id: string;
                        /** Format: uuid */
                        reviewer_id: string;
                        /** Format: uuid */
                        author_id: string;
                        approved_plan_digest: string;
                        /** Format: uuid */
                        policy_version_id: string;
                        /** Format: date-time */
                        decided_at: string;
                    } | {
                        /** @constant */
                        result: "NOT_REQUIRED_BY_POLICY";
                        /** Format: uuid */
                        decision_id: string;
                        /** Format: uuid */
                        policy_version_id: string;
                        approved_plan_digest: string;
                        /** @constant */
                        rule_id: "SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION";
                        /** Format: date-time */
                        decided_at: string;
                    };
                    approval_digest: string;
                    /** Format: date-time */
                    issued_at: string;
                    /** Format: date-time */
                    expires_at: string;
                    nonce: string;
                };
                signature: string;
            }[];
            /** @constant */
            poll_after_ms: 2000;
        };
        Health: {
            /** @constant */
            status: "alive";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "alive"
                     *     }
                     */
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    session: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "actor_domain": "STAFF",
                     *       "actor_id": "00000000-0000-4000-8000-000000000064",
                     *       "scope": {
                     *         "tenant_id": "00000000-0000-4000-8000-000000000065",
                     *         "legal_entity_id": "00000000-0000-4000-8000-000000000066",
                     *         "environment_id": "00000000-0000-4000-8000-000000000067"
                     *       },
                     *       "role": "ORG_SUPER_ADMIN",
                     *       "capabilities": [],
                     *       "mfa_verified": false,
                     *       "expires_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Session"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    overview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "scope": {
                     *         "tenant_id": "00000000-0000-4000-8000-000000000068",
                     *         "legal_entity_id": "00000000-0000-4000-8000-000000000069",
                     *         "environment_id": "00000000-0000-4000-8000-00000000006a"
                     *       },
                     *       "build_id": "a00-synthetic-example",
                     *       "contract_version": "1.0.0",
                     *       "profile": "CUSTOMER_LOCAL_SYNTHETIC",
                     *       "as_of": "2026-09-16T10:00:00.000Z",
                     *       "counts": {
                     *         "accepted": 0,
                     *         "running": 0,
                     *         "needs_attention": 0,
                     *         "completed": 0,
                     *         "effect_unknown": 0,
                     *         "manual_required": 0,
                     *         "failed": 0,
                     *         "unverified": 0
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Overview"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_purposes: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["PurposeList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_purposes: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "environment_id": "00000000-0000-4000-8000-00000000006b",
                 *       "legal_entity_id": "00000000-0000-4000-8000-00000000006c",
                 *       "code": "promotional_marketing",
                 *       "name": "Synthetic example",
                 *       "description": "Synthetic example"
                 *     }
                 */
                "application/json": components["schemas"]["PurposeCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "environment_id": "00000000-0000-4000-8000-00000000006d",
                     *       "legal_entity_id": "00000000-0000-4000-8000-00000000006e",
                     *       "code": "promotional_marketing",
                     *       "name": "Synthetic example",
                     *       "description": "Synthetic example",
                     *       "id": "00000000-0000-4000-8000-00000000006f",
                     *       "version_id": "00000000-0000-4000-8000-000000000070",
                     *       "version": 1,
                     *       "status": "DRAFT"
                     *     }
                     */
                    "application/json": components["schemas"]["Purpose"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_notices: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["NoticeList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_notices: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "purpose_id": "00000000-0000-4000-8000-000000000071",
                 *       "language": "en",
                 *       "title": "Synthetic example",
                 *       "content": "Synthetic example"
                 *     }
                 */
                "application/json": components["schemas"]["NoticeCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "purpose_id": "00000000-0000-4000-8000-000000000072",
                     *       "language": "en",
                     *       "title": "Synthetic example",
                     *       "content": "Synthetic example",
                     *       "id": "00000000-0000-4000-8000-000000000073",
                     *       "version_id": "00000000-0000-4000-8000-000000000074",
                     *       "content_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "published_at": null
                     *     }
                     */
                    "application/json": components["schemas"]["Notice"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_policies: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["PolicyList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_policies: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "purpose_id": "00000000-0000-4000-8000-000000000075",
                 *       "notice_version_id": "00000000-0000-4000-8000-000000000076",
                 *       "condition": "AFFIRMATIVE_MARKETING_CONSENT",
                 *       "system_ids": [
                 *         "00000000-0000-4000-8000-000000000077"
                 *       ],
                 *       "required_observation": false
                 *     }
                 */
                "application/json": components["schemas"]["PolicyCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "purpose_id": "00000000-0000-4000-8000-000000000078",
                     *       "notice_version_id": "00000000-0000-4000-8000-000000000079",
                     *       "condition": "AFFIRMATIVE_MARKETING_CONSENT",
                     *       "system_ids": [
                     *         "00000000-0000-4000-8000-00000000007a"
                     *       ],
                     *       "required_observation": false,
                     *       "id": "00000000-0000-4000-8000-00000000007b",
                     *       "version_id": "00000000-0000-4000-8000-00000000007c",
                     *       "digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "author_id": "00000000-0000-4000-8000-00000000007d",
                     *       "status": "DRAFT",
                     *       "published_at": null
                     *     }
                     */
                    "application/json": components["schemas"]["Policy"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_systems: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["SystemList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_systems: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "environment_id": "00000000-0000-4000-8000-00000000007e",
                 *       "legal_entity_id": "00000000-0000-4000-8000-00000000007f",
                 *       "name": "Synthetic example",
                 *       "connector": "SYNTHETIC_CRM"
                 *     }
                 */
                "application/json": components["schemas"]["SystemCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "environment_id": "00000000-0000-4000-8000-000000000080",
                     *       "legal_entity_id": "00000000-0000-4000-8000-000000000081",
                     *       "name": "Synthetic example",
                     *       "connector": "SYNTHETIC_CRM",
                     *       "id": "00000000-0000-4000-8000-000000000082",
                     *       "capability_version": "1.0.0",
                     *       "supports_restrict": false,
                     *       "supports_read": false,
                     *       "checked_at": null
                     *     }
                     */
                    "application/json": components["schemas"]["System"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    list_principals: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["PrincipalList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_principals: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "environment_id": "00000000-0000-4000-8000-000000000083",
                 *       "legal_entity_id": "00000000-0000-4000-8000-000000000084",
                 *       "display_name": "Synthetic example",
                 *       "email": "asha@aster.example"
                 *     }
                 */
                "application/json": components["schemas"]["PrincipalCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "environment_id": "00000000-0000-4000-8000-000000000085",
                     *       "legal_entity_id": "00000000-0000-4000-8000-000000000086",
                     *       "display_name": "Synthetic example",
                     *       "email": "asha@aster.example",
                     *       "id": "00000000-0000-4000-8000-000000000087",
                     *       "synthetic": true
                     *     }
                     */
                    "application/json": components["schemas"]["Principal"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    publish_policy: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "version_id": "00000000-0000-4000-8000-000000000088",
                 *       "digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                 *       "reauthentication_id": "00000000-0000-4000-8000-000000000089"
                 *     }
                 */
                "application/json": components["schemas"]["PolicyPublish"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "purpose_id": "00000000-0000-4000-8000-00000000008a",
                     *       "notice_version_id": "00000000-0000-4000-8000-00000000008b",
                     *       "condition": "AFFIRMATIVE_MARKETING_CONSENT",
                     *       "system_ids": [
                     *         "00000000-0000-4000-8000-00000000008c"
                     *       ],
                     *       "required_observation": false,
                     *       "id": "00000000-0000-4000-8000-00000000008d",
                     *       "version_id": "00000000-0000-4000-8000-00000000008e",
                     *       "digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "author_id": "00000000-0000-4000-8000-00000000008f",
                     *       "status": "DRAFT",
                     *       "published_at": null
                     *     }
                     */
                    "application/json": components["schemas"]["Policy"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    control_map: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "edges": []
                     *     }
                     */
                    "application/json": components["schemas"]["ControlMap"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    check_system: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "environment_id": "00000000-0000-4000-8000-000000000090",
                     *       "legal_entity_id": "00000000-0000-4000-8000-000000000091",
                     *       "name": "Synthetic example",
                     *       "connector": "SYNTHETIC_CRM",
                     *       "id": "00000000-0000-4000-8000-000000000092",
                     *       "capability_version": "1.0.0",
                     *       "supports_restrict": false,
                     *       "supports_read": false,
                     *       "checked_at": null
                     *     }
                     */
                    "application/json": components["schemas"]["System"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    own_consents: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["ConsentList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    grant: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                purpose_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expected_epoch": 0,
                 *       "notice_version_id": "00000000-0000-4000-8000-000000000093",
                 *       "interaction_id": "00000000-0000-4000-8000-000000000094",
                 *       "affirmative": true
                 *     }
                 */
                "application/json": components["schemas"]["Grant"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "receipt_id": "00000000-0000-4000-8000-000000000014",
                     *       "event_id": "00000000-0000-4000-8000-000000000015",
                     *       "purpose_id": "00000000-0000-4000-8000-000000000007",
                     *       "consent_status": "WITHDRAWN",
                     *       "consent_epoch": 2,
                     *       "accepted_at": "2026-09-16T10:00:00.000Z",
                     *       "workflow_id": "00000000-0000-4000-8000-00000000000a",
                     *       "propagation_status": "ACCEPTED"
                     *     }
                     */
                    "application/json": components["schemas"]["Receipt"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    withdraw: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                purpose_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expected_epoch": 0,
                 *       "interaction_id": "00000000-0000-4000-8000-000000000095"
                 *     }
                 */
                "application/json": components["schemas"]["Withdraw"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "receipt_id": "00000000-0000-4000-8000-000000000014",
                     *       "event_id": "00000000-0000-4000-8000-000000000015",
                     *       "purpose_id": "00000000-0000-4000-8000-000000000007",
                     *       "consent_status": "WITHDRAWN",
                     *       "consent_epoch": 2,
                     *       "accepted_at": "2026-09-16T10:00:00.000Z",
                     *       "workflow_id": "00000000-0000-4000-8000-00000000000a",
                     *       "propagation_status": "ACCEPTED"
                     *     }
                     */
                    "application/json": components["schemas"]["Receipt"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    own_receipt: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "receipt": {
                     *         "receipt_id": "00000000-0000-4000-8000-000000000014",
                     *         "event_id": "00000000-0000-4000-8000-000000000015",
                     *         "purpose_id": "00000000-0000-4000-8000-000000000007",
                     *         "consent_status": "WITHDRAWN",
                     *         "consent_epoch": 2,
                     *         "accepted_at": "2026-09-16T10:00:00.000Z",
                     *         "workflow_id": "00000000-0000-4000-8000-00000000000a",
                     *         "propagation_status": "ACCEPTED"
                     *       },
                     *       "current": {
                     *         "consent_status": "GRANTED",
                     *         "consent_epoch": 3,
                     *         "propagation_status": "NEEDS_ATTENTION",
                     *         "as_of": "2026-09-16T10:10:00.000Z"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["ReceiptView"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    workflows: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["WorkflowList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    workflow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "00000000-0000-4000-8000-000000000096",
                     *       "event_id": "00000000-0000-4000-8000-000000000097",
                     *       "purpose_id": "00000000-0000-4000-8000-000000000098",
                     *       "state": "ACCEPTED",
                     *       "accepted_at": "2026-09-16T10:00:00.000Z",
                     *       "updated_at": "2026-09-16T10:00:00.000Z",
                     *       "actions": [],
                     *       "obligations": []
                     *     }
                     */
                    "application/json": components["schemas"]["Workflow"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    reconcile: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "operation_id": "00000000-0000-4000-8000-000000000099",
                     *       "status": "ACCEPTED",
                     *       "accepted_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["AcceptedOperation"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    attest: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "statement": "Synthetic example",
                 *       "evidence_record_ids": [
                 *         "00000000-0000-4000-8000-00000000009a"
                 *       ],
                 *       "expected_task_version": 0
                 *     }
                 */
                "application/json": components["schemas"]["ManualAttestation"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "operation_id": "00000000-0000-4000-8000-00000000009b",
                     *       "status": "ACCEPTED",
                     *       "accepted_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["AcceptedOperation"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    failures: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["FailureList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    evidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "workflow": {
                     *         "id": "00000000-0000-4000-8000-00000000009c",
                     *         "event_id": "00000000-0000-4000-8000-00000000009d",
                     *         "purpose_id": "00000000-0000-4000-8000-00000000009e",
                     *         "state": "ACCEPTED",
                     *         "accepted_at": "2026-09-16T10:00:00.000Z",
                     *         "updated_at": "2026-09-16T10:00:00.000Z",
                     *         "actions": [],
                     *         "obligations": []
                     *       },
                     *       "receipts": [],
                     *       "policy_version_ids": [],
                     *       "notice_version_ids": [],
                     *       "tests": [],
                     *       "exported_at": "2026-09-16T10:00:00.000Z",
                     *       "coverage_limits": [],
                     *       "integrity_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "integrity_limit": "Digest detects change relative to a trusted reference; it does not prove external effects or prevent privileged rewriting."
                     *     }
                     */
                    "application/json": components["schemas"]["Evidence"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    export: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "workflow": {
                     *         "id": "00000000-0000-4000-8000-00000000009f",
                     *         "event_id": "00000000-0000-4000-8000-0000000000a0",
                     *         "purpose_id": "00000000-0000-4000-8000-0000000000a1",
                     *         "state": "ACCEPTED",
                     *         "accepted_at": "2026-09-16T10:00:00.000Z",
                     *         "updated_at": "2026-09-16T10:00:00.000Z",
                     *         "actions": [],
                     *         "obligations": []
                     *       },
                     *       "receipts": [],
                     *       "policy_version_ids": [],
                     *       "notice_version_ids": [],
                     *       "tests": [],
                     *       "exported_at": "2026-09-16T10:00:00.000Z",
                     *       "coverage_limits": [],
                     *       "integrity_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "integrity_limit": "Digest detects change relative to a trusted reference; it does not prove external effects or prevent privileged rewriting."
                     *     }
                     */
                    "application/json": components["schemas"]["Evidence"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    evaluate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "principal_id": "00000000-0000-4000-8000-0000000000a2",
                 *       "purpose_id": "00000000-0000-4000-8000-0000000000a3",
                 *       "system_id": "00000000-0000-4000-8000-0000000000a4",
                 *       "action": "MARKETING_SEND"
                 *     }
                 */
                "application/json": components["schemas"]["Evaluate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "decision_id": "00000000-0000-4000-8000-0000000000a5",
                     *       "decision": "ALLOW",
                     *       "reason_codes": [
                     *         "SYNTHETIC_EXAMPLE"
                     *       ],
                     *       "policy_version_id": null,
                     *       "consent_epoch": null,
                     *       "preview_only": true,
                     *       "evaluated_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Decision"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    start_test: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "scenario": "MARKETING_WITHDRAWAL_HEALTHY",
                 *       "profile": "codex-a00",
                 *       "fixture_id": "aster-birch-v1"
                 *     }
                 */
                "application/json": components["schemas"]["TestRunCreate"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "00000000-0000-4000-8000-0000000000a6",
                     *       "request": {
                     *         "scenario": "MARKETING_WITHDRAWAL_HEALTHY",
                     *         "profile": "codex-a00",
                     *         "fixture_id": "aster-birch-v1"
                     *       },
                     *       "state": "NOT_RUN",
                     *       "build_id": "a00-synthetic-example",
                     *       "contract_version": "1.0.0",
                     *       "started_at": null,
                     *       "finished_at": null,
                     *       "assertions": [],
                     *       "expected_fault_detection": false
                     *     }
                     */
                    "application/json": components["schemas"]["TestRun"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    test_run: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "00000000-0000-4000-8000-0000000000a7",
                     *       "request": {
                     *         "scenario": "MARKETING_WITHDRAWAL_HEALTHY",
                     *         "profile": "codex-a00",
                     *         "fixture_id": "aster-birch-v1"
                     *       },
                     *       "state": "NOT_RUN",
                     *       "build_id": "a00-synthetic-example",
                     *       "contract_version": "1.0.0",
                     *       "started_at": null,
                     *       "finished_at": null,
                     *       "assertions": [],
                     *       "expected_fault_detection": false
                     *     }
                     */
                    "application/json": components["schemas"]["TestRun"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    capabilities: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "next_cursor": null
                     *     }
                     */
                    "application/json": components["schemas"]["CapabilityList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    poll_commands: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "installation_id": "00000000-0000-4000-8000-0000000000a8",
                 *       "environment_id": "00000000-0000-4000-8000-0000000000a9",
                 *       "maximum_commands": 1
                 *     }
                 */
                "application/json": components["schemas"]["PollRequest"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "commands": [],
                     *       "poll_after_ms": 2000
                     *     }
                     */
                    "application/json": components["schemas"]["CommandList"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    command_receipt: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "command_id": "00000000-0000-4000-8000-0000000000aa",
                 *       "command_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                 *       "attempt_id": "00000000-0000-4000-8000-0000000000ab",
                 *       "execution_state": "ACKNOWLEDGED",
                 *       "recorded_at": "2026-09-16T10:00:00.000Z",
                 *       "reason_code": "SYNTHETIC_EXAMPLE",
                 *       "target_generation": 0
                 *     }
                 */
                "application/json": components["schemas"]["CommandReceipt"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "operation_id": "00000000-0000-4000-8000-0000000000ac",
                     *       "status": "ACCEPTED",
                     *       "accepted_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["AcceptedOperation"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    send: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "attempt_id": "00000000-0000-4000-8000-0000000000ad",
                 *       "principal_reference_id": "00000000-0000-4000-8000-0000000000ae",
                 *       "purpose_id": "00000000-0000-4000-8000-0000000000af",
                 *       "system_id": "00000000-0000-4000-8000-0000000000b0",
                 *       "message_class": "MARKETING",
                 *       "order_reference": null
                 *     }
                 */
                "application/json": components["schemas"]["SendRequest"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "attempt_id": "00000000-0000-4000-8000-00000000001e",
                     *       "decision": "BLOCK",
                     *       "send_record_id": null,
                     *       "admitted_at": null,
                     *       "evaluated_epoch": 2,
                     *       "reason_codes": [
                     *         "CONSENT_WITHDRAWN"
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["SendResult"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    restrict: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "algorithm": "Ed25519",
                 *       "payload": {
                 *         "schema_version": "0.2.1",
                 *         "command_id": "00000000-0000-4000-8000-00000000000d",
                 *         "installation_id": "00000000-0000-4000-8000-00000000000e",
                 *         "signing_key_id": "00000000-0000-4000-8000-00000000000f",
                 *         "binding": {
                 *           "workflow_id": "00000000-0000-4000-8000-00000000000a",
                 *           "action_id": "00000000-0000-4000-8000-00000000000b",
                 *           "scope": {
                 *             "tenant_id": "00000000-0000-4000-8000-000000000001",
                 *             "legal_entity_id": "00000000-0000-4000-8000-000000000002",
                 *             "environment_id": "00000000-0000-4000-8000-000000000003",
                 *             "principal_reference_id": "00000000-0000-4000-8000-000000000004",
                 *             "system_id": "00000000-0000-4000-8000-000000000005",
                 *             "resource_id": "00000000-0000-4000-8000-000000000006",
                 *             "target_subject_reference": "syn_asha_demo",
                 *             "purpose_id": "00000000-0000-4000-8000-000000000007",
                 *             "policy_version_id": "00000000-0000-4000-8000-000000000008",
                 *             "consent_epoch": 2,
                 *             "target_generation": 1,
                 *             "operation": "CRM_REMOVE_MARKETING_MEMBERSHIP"
                 *           },
                 *           "capability": "restrict_exact_synthetic_subject",
                 *           "capability_version": "1.0.0",
                 *           "operation_budget": {
                 *             "maximum_records": 1,
                 *             "maximum_attempts": 3
                 *           }
                 *         },
                 *         "scope_digest": "90843c7c05f3d0557737d5b592a4a6d125d42195130ee0f2c0c162f906aa530b",
                 *         "plan_digest": "d984de499554bbfdb9acdf8a627333201ce2c444677d718c5236912acfc063ea",
                 *         "approval": {
                 *           "result": "NOT_REQUIRED_BY_POLICY",
                 *           "decision_id": "00000000-0000-4000-8000-00000000000c",
                 *           "policy_version_id": "00000000-0000-4000-8000-000000000008",
                 *           "approved_plan_digest": "d984de499554bbfdb9acdf8a627333201ce2c444677d718c5236912acfc063ea",
                 *           "rule_id": "SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION",
                 *           "decided_at": "2026-09-16T10:00:00.000Z"
                 *         },
                 *         "approval_digest": "c69250740f5d03c0e0c0eb206154fabc8cbd1ba3d61b5b318113ce3c8f396d88",
                 *         "issued_at": "2026-09-16T10:00:00.000Z",
                 *         "expires_at": "2026-09-16T10:04:00.000Z",
                 *         "nonce": "synthetic_example_nonce_000000000000000001"
                 *       },
                 *       "signature": "fkZUMkZ52oaxzOK2N679_lK5yy6RGfuGhv0GWZd9UhaQTV4Op5Fvcj-Lls7yxGc0d3S3ChdrrdXbOLPkiCtACQ"
                 *     }
                 */
                "application/json": components["schemas"]["SignedCommand"];
            };
        };
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "command_id": "00000000-0000-4000-8000-0000000000b1",
                     *       "command_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "attempt_id": "00000000-0000-4000-8000-0000000000b2",
                     *       "execution_state": "ACKNOWLEDGED",
                     *       "recorded_at": "2026-09-16T10:00:00.000Z",
                     *       "reason_code": "SYNTHETIC_EXAMPLE",
                     *       "target_generation": 0
                     *     }
                     */
                    "application/json": components["schemas"]["CommandReceipt"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    read_simulator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "resource_id": "00000000-0000-4000-8000-0000000000b3",
                     *       "generation": 0,
                     *       "last_applied_epoch": 0,
                     *       "marketing_restricted": false,
                     *       "observed_at": "2026-09-16T10:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["SimulatorState"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    read_simulator_receipt: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Typed contract response; endpoint implementation is ticket-gated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "command_id": "00000000-0000-4000-8000-0000000000b4",
                     *       "command_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                     *       "attempt_id": "00000000-0000-4000-8000-0000000000b5",
                     *       "execution_state": "ACKNOWLEDGED",
                     *       "recorded_at": "2026-09-16T10:00:00.000Z",
                     *       "reason_code": "SYNTHETIC_EXAMPLE",
                     *       "target_generation": 0
                     *     }
                     */
                    "application/json": components["schemas"]["CommandReceipt"];
                };
            };
            /** @description VALIDATION_ERROR */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description UNAUTHENTICATED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REAUTHENTICATE"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description FORBIDDEN */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "NEVER"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description EPOCH_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "EPOCH_CONFLICT",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "REFRESH"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RATE_LIMITED",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description SERVICE_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "SERVICE_UNAVAILABLE",
                     *         "message": "Synthetic safe error example",
                     *         "retry": "AFTER_DELAY"
                     *       },
                     *       "request_id": "00000000-0000-4000-8000-000000000001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}
