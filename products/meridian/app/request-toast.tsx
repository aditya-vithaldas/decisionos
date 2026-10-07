import {Check,LoaderCircle,X} from 'lucide-react';
const steps=['Understanding…','Creating query…','Retrieving data…','Analyzing…','Showing answer…'];
export default function RequestToast({activity,dismiss}:{activity:{step:number;error?:string;detail?:string}|null;dismiss:()=>void}){
 if(!activity)return null;const done=activity.step===5,failed=!!activity.error;
 return <aside className={`an-request-toast ${done?'is-complete':''} ${failed?'is-error':''}`} aria-label="Request progress" tabIndex={0} aria-describedby="request-detail">
  <div className="an-request-icon">{done?<Check size={18}/>:failed?<X size={18}/>:<LoaderCircle size={18}/>}</div>
  <div className="an-request-body"><p role="status" aria-live="polite" aria-atomic="true">{failed?(activity.error?.startsWith('Low confidence:')?'Low confidence':'Please try again'):done?'Ready':steps[activity.step]}</p></div>
  <div id="request-detail" role="tooltip" className="an-request-detail">{activity.detail||activity.error||steps[Math.min(activity.step,4)]}</div>
  <button onClick={dismiss} aria-label="Dismiss request progress"><X size={15}/></button>
 </aside>;
}
