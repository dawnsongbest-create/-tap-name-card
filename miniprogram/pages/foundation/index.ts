import { getEnvironmentConfig, getEnvironmentSummary } from '../../config/env';
import { createAuthApi } from '../../services/auth';
import { createCloudFunctionCallerForEnvironment, getWxCloudApi } from '../../services/cloud';
import { createRequestIdProvider } from '../../shared/types/request-id';
import { mapAuthResultToState } from '../../state/auth';
import {
  getWxCloudDatabaseApi,
  runConcurrentEnsureValidation,
  runDatabasePermissionValidation,
  runIdentityPolicyValidation,
  type ValidationStatus,
} from './final-validation';
import {
  createDevelopmentPolicyProbeView,
  getDevelopmentPolicyAcceptanceInput,
} from './policy-probe';
import {
  INITIAL_RENDERER_LAB_SELECTION,
  RENDERER_LAB_TEMPLATE_IDS,
  createRendererLabModel,
  getRendererLabScenarios,
  isRendererLabTemplateId,
  readRendererLabSelection,
} from './renderer-lab';

interface RendererLabSelectionEvent {
  readonly currentTarget: {
    readonly dataset: Readonly<Record<string, unknown>>;
  };
}

const environment = getEnvironmentSummary();
const environmentConfig = getEnvironmentConfig();
const developmentPolicyAcceptanceInput = getDevelopmentPolicyAcceptanceInput(environmentConfig);
const permissionProbeIds = createRequestIdProvider('validation_probe');
const authApi = createAuthApi(
  createCloudFunctionCallerForEnvironment(environmentConfig, getWxCloudApi()),
  createRequestIdProvider('m1_2_development'),
);

Page({
  data: {
    environmentName: environment.environment,
    cloudStatus: environment.cloudConfigured ? 'development 已配置，等待云端验收' : '未配置',
    retryCount: 0,
    authState: 'ANONYMOUS',
    authRequestId: '尚未手动调用',
    showDevelopmentPolicyProbe: Boolean(developmentPolicyAcceptanceInput),
    policyProbeLoading: false,
    policyResultStatus: '尚未调用',
    policyClientState: 'ANONYMOUS',
    policyNeedsAcceptance: '—',
    policyAcceptedTermsVersion: '—',
    policyAcceptedPrivacyVersion: '—',
    policyRequestId: '尚未手动调用',
    policyReplayed: '—',
    automaticValidationLoading: false,
    automaticValidationResult: '尚未运行',
    ensureValidationTotal: 0,
    ensureValidationSuccess: 0,
    ensureValidationFailure: 0,
    ensureValidationDistinctUsers: 0,
    ensureValidationConsistent: '尚未运行',
    getMeValidationResult: '尚未运行',
    getMeSameUser: '尚未运行',
    getMeStatusConsistent: '尚未运行',
    getMeStrictView: '尚未运行',
    getMeNoAdditionalEnsure: '尚未运行',
    automaticPolicyResult: '尚未运行',
    automaticPolicyBothSucceeded: '尚未运行',
    automaticPolicyNeedsCleared: '尚未运行',
    automaticPolicyVersions: '尚未运行',
    automaticPolicyReplayed: '尚未运行',
    automaticPolicyStatusUnchanged: '尚未运行',
    concurrentValidationLoading: false,
    concurrentValidationTotal: 0,
    concurrentValidationSuccess: 0,
    concurrentValidationFailure: 0,
    concurrentValidationDistinctUsers: 0,
    concurrentValidationConsistent: '尚未运行',
    permissionValidationLoading: false,
    permissionValidationResult: '尚未运行',
    usersReadPermission: '尚未运行',
    usersWritePermission: '尚未运行',
    mappingsReadPermission: '尚未运行',
    mappingsWritePermission: '尚未运行',
    permissionOperationOutcome: 'NOT_RUN',
    permissionOperationCount: '—',
    permissionDiagnosticType: '—',
    permissionDiagnosticCode: '—',
    permissionDiagnosticErrCode: '—',
    permissionDiagnosticErrno: '—',
    permissionDiagnosticName: 'NOT_RUN',
    permissionDiagnosticDenied: 'false',
    permissionDiagnosticRequestId: '—',
    rendererLabTemplateIds: RENDERER_LAB_TEMPLATE_IDS,
    rendererLabScenarios: getRendererLabScenarios(INITIAL_RENDERER_LAB_SELECTION.templateId),
    rendererLabTemplateId: INITIAL_RENDERER_LAB_SELECTION.templateId,
    rendererLabScenario: INITIAL_RENDERER_LAB_SELECTION.scenario,
    rendererLabModel: createRendererLabModel(INITIAL_RENDERER_LAB_SELECTION),
  },
  onSelectRendererLabTemplate(event: RendererLabSelectionEvent) {
    const templateId = event.currentTarget.dataset.templateId;

    if (!isRendererLabTemplateId(templateId)) {
      return;
    }

    const availableScenarios = getRendererLabScenarios(templateId);
    const scenario = availableScenarios.includes(this.data.rendererLabScenario)
      ? this.data.rendererLabScenario
      : 'NORMAL';
    const selection = readRendererLabSelection(templateId, scenario);

    if (!selection) {
      return;
    }

    this.setData({
      rendererLabTemplateId: selection.templateId,
      rendererLabScenario: selection.scenario,
      rendererLabScenarios: availableScenarios,
      rendererLabModel: createRendererLabModel(selection),
    });
  },
  onSelectRendererLabScenario(event: RendererLabSelectionEvent) {
    const selection = readRendererLabSelection(
      this.data.rendererLabTemplateId,
      event.currentTarget.dataset.scenario,
    );

    if (!selection) {
      return;
    }

    this.setData({
      rendererLabScenario: selection.scenario,
      rendererLabModel: createRendererLabModel(selection),
    });
  },
  onRetry() {
    this.setData({
      retryCount: this.data.retryCount + 1,
    });
  },
  async onEnsureUser() {
    this.setData({ authState: 'LOADING' });
    const result = await authApi.ensureUser();
    const state = mapAuthResultToState(result);

    this.setData({
      authState: state.kind,
      authRequestId: result.requestId,
    });
  },
  async onGetMe() {
    this.setData({ authState: 'LOADING' });
    const result = await authApi.getMe();
    const state = mapAuthResultToState(result);

    this.setData({
      authState: state.kind,
      authRequestId: result.requestId,
    });
  },
  async onAcceptV1Policies() {
    if (!developmentPolicyAcceptanceInput || this.data.policyProbeLoading) {
      return;
    }

    this.setData({
      policyProbeLoading: true,
      policyResultStatus: 'LOADING',
    });

    const result = await authApi.acceptPolicies(developmentPolicyAcceptanceInput);
    const view = createDevelopmentPolicyProbeView(result);

    this.setData({
      authState: view.clientState,
      authRequestId: view.requestId,
      policyProbeLoading: false,
      policyResultStatus: view.resultStatus,
      policyClientState: view.clientState,
      policyNeedsAcceptance: view.needsPolicyAcceptance,
      policyAcceptedTermsVersion: view.acceptedTermsVersion,
      policyAcceptedPrivacyVersion: view.acceptedPrivacyVersion,
      policyRequestId: view.requestId,
      policyReplayed: view.replayed,
    });
  },
  async onRunIdentityPolicyValidation() {
    if (!developmentPolicyAcceptanceInput || this.data.automaticValidationLoading) {
      return;
    }

    this.setData({
      automaticValidationLoading: true,
      automaticValidationResult: 'RUNNING',
    });

    const view = await runIdentityPolicyValidation(authApi, environmentConfig);

    if (!view) {
      this.setData({
        automaticValidationLoading: false,
        automaticValidationResult: 'NOT_RUN',
      });
      return;
    }

    this.setData({
      automaticValidationLoading: false,
      automaticValidationResult: view.result,
      ensureValidationTotal: view.ensure.totalCalls,
      ensureValidationSuccess: view.ensure.successCount,
      ensureValidationFailure: view.ensure.failureCount,
      ensureValidationDistinctUsers: view.ensure.distinctUserCount,
      ensureValidationConsistent: toValidationStatus(view.ensure.consistent),
      getMeValidationResult: view.getMe.result,
      getMeSameUser: toValidationStatus(view.getMe.sameUser),
      getMeStatusConsistent: toValidationStatus(view.getMe.statusConsistent),
      getMeStrictView: toValidationStatus(view.getMe.strictCurrentUserView),
      getMeNoAdditionalEnsure: toValidationStatus(view.getMe.noAdditionalEnsure),
      automaticPolicyResult: view.policies.result,
      automaticPolicyBothSucceeded: toValidationStatus(view.policies.bothSucceeded),
      automaticPolicyNeedsCleared: toValidationStatus(view.policies.needsPolicyAcceptanceCleared),
      automaticPolicyVersions: toValidationStatus(view.policies.versionsAreV1),
      automaticPolicyReplayed: toValidationStatus(view.policies.secondReplayed),
      automaticPolicyStatusUnchanged: toValidationStatus(view.policies.statusUnchanged),
      authState: view.lastPolicy.clientState,
      authRequestId: view.lastPolicy.requestId,
      policyResultStatus: view.lastPolicy.resultStatus,
      policyClientState: view.lastPolicy.clientState,
      policyNeedsAcceptance: view.lastPolicy.needsPolicyAcceptance,
      policyAcceptedTermsVersion: view.lastPolicy.acceptedTermsVersion,
      policyAcceptedPrivacyVersion: view.lastPolicy.acceptedPrivacyVersion,
      policyRequestId: view.lastPolicy.requestId,
      policyReplayed: view.lastPolicy.replayed,
    });
  },
  async onRunConcurrentEnsureValidation() {
    if (!developmentPolicyAcceptanceInput || this.data.concurrentValidationLoading) {
      return;
    }

    this.setData({
      concurrentValidationLoading: true,
      concurrentValidationConsistent: 'RUNNING',
    });

    const view = await runConcurrentEnsureValidation(authApi, environmentConfig, 20);

    if (!view) {
      this.setData({
        concurrentValidationLoading: false,
        concurrentValidationConsistent: 'NOT_RUN',
      });
      return;
    }

    this.setData({
      concurrentValidationLoading: false,
      concurrentValidationTotal: view.totalCalls,
      concurrentValidationSuccess: view.successCount,
      concurrentValidationFailure: view.failureCount,
      concurrentValidationDistinctUsers: view.distinctUserCount,
      concurrentValidationConsistent: toValidationStatus(view.consistent),
    });
  },
  async onRunDatabasePermissionValidation() {
    if (!developmentPolicyAcceptanceInput || this.data.permissionValidationLoading) {
      return;
    }

    this.setData({
      permissionValidationLoading: true,
      permissionValidationResult: 'RUNNING',
      usersReadPermission: 'RUNNING',
      usersWritePermission: 'NOT_RUN',
      mappingsReadPermission: 'NOT_RUN',
      mappingsWritePermission: 'NOT_RUN',
      permissionOperationOutcome: 'RUNNING',
      permissionOperationCount: '—',
      permissionDiagnosticType: 'pending',
      permissionDiagnosticCode: '—',
      permissionDiagnosticErrCode: '—',
      permissionDiagnosticErrno: '—',
      permissionDiagnosticName: 'RUNNING',
      permissionDiagnosticDenied: 'false',
      permissionDiagnosticRequestId: '—',
    });

    const view = await runDatabasePermissionValidation(
      getWxCloudDatabaseApi(),
      environmentConfig,
      permissionProbeIds,
    );

    this.setData({
      permissionValidationLoading: false,
      permissionValidationResult: view.result,
      usersReadPermission: view.usersRead,
      usersWritePermission: view.usersWrite,
      mappingsReadPermission: view.mappingsRead,
      mappingsWritePermission: view.mappingsWrite,
      permissionOperationOutcome: view.diagnostic.operationOutcome,
      permissionOperationCount: view.diagnostic.count,
      permissionDiagnosticType: view.diagnostic.errorType,
      permissionDiagnosticCode: view.diagnostic.code,
      permissionDiagnosticErrCode: view.diagnostic.errCode,
      permissionDiagnosticErrno: view.diagnostic.errno,
      permissionDiagnosticName: view.diagnostic.normalizedName,
      permissionDiagnosticDenied: String(view.diagnostic.permissionDenied),
      permissionDiagnosticRequestId: view.diagnostic.requestId,
    });
  },
});

function toValidationStatus(value: boolean): ValidationStatus {
  return value ? 'PASS' : 'FAIL';
}
