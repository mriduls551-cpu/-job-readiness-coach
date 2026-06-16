import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:3000';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa-screenshots');
mkdirSync(OUT, { recursive: true });

let cookie = '';
function captureCookie(res){
  const sc = res.headers.get('set-cookie');
  if(sc){ cookie = sc.split(';')[0]; }
}
async function req(method, path, body, raw=false){
  const headers = { 'content-type':'application/json' };
  if(cookie) headers['cookie']=cookie;
  const res = await fetch(BASE+path, { method, headers, body: body?JSON.stringify(body):undefined, redirect:'manual' });
  captureCookie(res);
  const text = await res.text();
  let json=null; try{ json=JSON.parse(text); }catch{}
  return { status: res.status, json, text, ct: res.headers.get('content-type') };
}
function save(name, content){ writeFileSync(`${OUT}/${name}`, content); }
const log = [];
function L(...a){ const s=a.join(' '); console.log(s); log.push(s); }

const email = `fresher_${Date.now()}@example.com`;
const pass = 'TestPass123!';

(async()=>{
 try{
  // HEALTH
  const h = await req('GET','/api/health');
  L('HEALTH', h.status, JSON.stringify(h.json||h.text).slice(0,300));

  // HOME HTML
  const home = await req('GET','/');
  L('HOME', home.status, 'len', home.text.length);
  save('01-home.html', home.text);

  // REGISTER page
  const regp = await req('GET','/register');
  L('REGISTER-PAGE', regp.status); save('02-register-page.html', regp.text);

  // REGISTER api
  const reg = await req('POST','/api/auth/register',{ email, name:'Aarav Sharma', password:pass });
  L('REGISTER-API', reg.status, JSON.stringify(reg.json).slice(0,300));

  // LOGIN api (sets auth-token cookie)
  const login = await req('POST','/api/auth/login',{ email, password:pass });
  L('LOGIN-API', login.status, 'cookie?', cookie?'YES':'NO', JSON.stringify(login.json).slice(0,200));

  // SESSION
  const sess = await req('GET','/api/auth/session');
  L('SESSION', sess.status, JSON.stringify(sess.json).slice(0,200));

  // PROFILE page + api
  const profp = await req('GET','/profile'); L('PROFILE-PAGE', profp.status); save('03-profile-page.html', profp.text);
  const prof = await req('GET','/api/profile'); L('PROFILE-GET', prof.status, JSON.stringify(prof.json).slice(0,250));
  const profPost = await req('POST','/api/profile',{ name:'Aarav Sharma' }); L('PROFILE-POST', profPost.status, JSON.stringify(profPost.json).slice(0,200));

  // CAREER FIT CHECK page
  const cfc = await req('GET','/career-fit-check'); L('CAREERFIT-PAGE', cfc.status); save('04-career-fit-check.html', cfc.text);

  // Submit fit-check (answer routing q's + branch). Use option 'a' for each.
  const responses = { r1:'r1_a', r2:'r2_a', r3:'r3_a', r4:'r4_a', r5:'r5_a',
                      b1:'pf_b1_a', b2:'pf_b2_a', b3:'pf_b3_a', b4:'pf_b4_a' };
  const fit = await req('POST','/api/assessment/fit-check',{ responses, profile:{ fullName:'Aarav Sharma', city:'Pune', degreeName:'B.Com', locale:'en' } });
  L('FITCHECK-POST', fit.status);
  save('05-fitcheck-result.json', JSON.stringify(fit.json,null,2));
  const top = fit.json?.data?.result?.topRoles || fit.json?.result?.topRoles || [];
  L('TOP-ROLES', top.map(r=>`${r.roleId}(${r.score??r.matchScore??'?'})`).join(', '));
  if(top[0]){ L('TOP1-RATIONALE', JSON.stringify(top[0].rationale).slice(0,400)); }
  const roleId = fit.json?.data?.selectedRoleId || top[0]?.roleId;
  L('SELECTED-ROLE', roleId);

  // RESULTS page
  const results = await req('GET','/results'); L('RESULTS-PAGE', results.status); save('06-results.html', results.text);

  // RESUME: init from role
  const resumeInit = await req('POST','/api/resumes',{ roleId, profile:{ fullName:'Aarav Sharma', city:'Pune', degreeName:'B.Com', locale:'en' } });
  L('RESUME-INIT', resumeInit.status, JSON.stringify(resumeInit.json).slice(0,300));
  save('07-resume-init.json', JSON.stringify(resumeInit.json,null,2));
  // resume page
  const resp = await req('GET','/resume'); L('RESUME-PAGE', resp.status); save('08-resume-page.html', resp.text);
  // resume GET
  const rget = await req('GET','/api/resumes'); L('RESUME-GET', rget.status, JSON.stringify(rget.json).slice(0,200));
  // resume download
  const dl = await fetch(BASE+'/api/resume/download',{ headers: cookie?{cookie}:{} });
  const buf = Buffer.from(await dl.arrayBuffer());
  L('RESUME-DOWNLOAD', dl.status, dl.headers.get('content-type'), 'bytes', buf.length, 'pdfMagic', buf.slice(0,5).toString());
  if(dl.status===200) save('09-resume.pdf', buf);

  // PLAN
  const planPost = await req('POST','/api/plan',{ roleId, profile:{ city:'Pune', degreeName:'B.Com', locale:'en' } });
  L('PLAN-POST', planPost.status);
  save('10-plan.json', JSON.stringify(planPost.json,null,2));
  const tasks = planPost.json?.data?.plan?.tasks || planPost.json?.plan?.tasks || [];
  L('PLAN-TASKS', tasks.length, tasks.map(t=>t.title).join(' | ').slice(0,400));
  const planp = await req('GET','/plan'); L('PLAN-PAGE', planp.status); save('11-plan-page.html', planp.text);

  // APPLICATIONS
  const appPost = await req('POST','/api/applications',{ companyName:'Infosys BPM', roleTitle:'Customer Support Associate', notes:'Applied via Naukri' });
  L('APP-POST', appPost.status, JSON.stringify(appPost.json).slice(0,200));
  const appGet = await req('GET','/api/applications'); L('APP-GET', appGet.status, JSON.stringify(appGet.json).slice(0,250));
  const appp = await req('GET','/applications'); L('APP-PAGE', appp.status); save('12-applications-page.html', appp.text);

  // INTERVIEW
  const intp = await req('GET','/interview'); L('INTERVIEW-PAGE', intp.status); save('13-interview-page.html', intp.text);
  // agent chat
  const chat = await req('POST','/api/agent/chat',{ message:'How do I prepare for my first interview?' , locale:'en'});
  L('AGENT-CHAT', chat.status, JSON.stringify(chat.json).slice(0,400));

  // DASHBOARD
  const dash = await req('GET','/api/dashboard'); L('DASHBOARD-API', dash.status, JSON.stringify(dash.json).slice(0,300));
  save('14-dashboard.json', JSON.stringify(dash.json,null,2));
  const dashp = await req('GET','/dashboard'); L('DASHBOARD-PAGE', dashp.status); save('15-dashboard-page.html', dashp.text);

 }catch(e){ L('FATAL', e.stack||e.message); }
 save('00-journey-log.txt', log.join('\n'));
})();
