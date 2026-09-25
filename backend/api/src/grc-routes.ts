import type {Context,Page} from '../../domain/src/shared/transaction.ts';
import * as A from '../../domain/src/grc/audits.ts';
import {grcList,createGrcFramework,createGrcControl,grcDetail,submitGrcEvidence,reviewGrcEvidence,grcEvidenceHistory} from '../../domain/src/grc/grc.ts';
import {grcRiskList,createGrcRisk,grcRiskDetail,proposeGrcRiskTreatment,reviewGrcRiskTreatment,grcTreatmentHistory} from '../../domain/src/grc/risks.ts';

export async function grcRoute(c:Context,operation:string,id:string|undefined,input:unknown,page:Page):Promise<unknown|undefined>{
  switch(operation){
    case 'grc_audit_response_history':return A.grcAuditResponseHistory(c,id!,page);
    case 'list_grc_audits':return A.grcAuditList(c,page);
    case 'create_grc_audit':return A.createGrcAudit(c,input);
    case 'grc_audit_detail':return A.grcAuditDetail(c,id!);
    case 'grc_audit_requests':return A.grcAuditRequests(c,id!,page);
    case 'create_grc_audit_request':return A.createGrcAuditRequest(c,id!,input);
    case 'grc_audit_request_detail':return A.grcAuditRequestDetail(c,id!);
    case 'respond_grc_audit_request':return A.respondGrcAuditRequest(c,id!,input);
    case 'review_grc_audit_response':return A.reviewGrcAuditResponse(c,id!,input);
    case 'close_grc_audit':return A.closeGrcAudit(c,id!,input);
    case 'grc_evidence_history':return grcEvidenceHistory(c,id!,page);
    case 'grc_treatment_history':return grcTreatmentHistory(c,id!,page);
    case 'list_grc_frameworks':return grcList(c,'frameworks',page);
    case 'create_grc_framework':return createGrcFramework(c,input);
    case 'list_grc_controls':return grcList(c,'controls',page);
    case 'create_grc_control':return createGrcControl(c,input);
    case 'grc_control_detail':return grcDetail(c,id!);
    case 'submit_grc_evidence':return submitGrcEvidence(c,id!,input);
    case 'review_grc_evidence':return reviewGrcEvidence(c,id!,input);
    case 'list_grc_risks':return grcRiskList(c,page);
    case 'create_grc_risk':return createGrcRisk(c,input);
    case 'grc_risk_detail':return grcRiskDetail(c,id!);
    case 'propose_grc_treatment':return proposeGrcRiskTreatment(c,id!,input);
    case 'review_grc_treatment':return reviewGrcRiskTreatment(c,id!,input);
  }
}
