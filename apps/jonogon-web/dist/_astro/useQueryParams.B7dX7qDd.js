import{r as s}from"./index.CC7gbGQC.js";const b=new Set;function R(){b.forEach(t=>{t()})}(function(t){function n(c){return function(...a){const u=c.apply(t,a);return R(),u}}t.pushState=n(t.pushState),t.replaceState=n(t.replaceState),window.addEventListener("popstate",()=>{R()})})(window.history);function L(t,n,c=!1){const a=t instanceof URL?t.searchParams:t;c&&a.forEach((u,o)=>{o in n||a.delete(o)});for(const[u,o]of Object.entries(n)){const h=Array.isArray(o)?o:[o];a.delete(u);for(const i of h)a.append(u,i??"")}return t}function y(){const t=window.location.href,n=s.useMemo(()=>new URLSearchParams(window.location.search),[t]),c=s.useRef({}),a=s.useRef(!1),u=s.useRef(!1),o=s.useCallback(r=>{r in c.current||u.current||a.current||(c.current[r]=n.getAll(String(r)))},[n,c]),h=s.useCallback(()=>{c.current={},a.current=!1},[c]),[,i]=s.useReducer(r=>r+1,0),S=s.useCallback(()=>{i()},[i]),p=s.useCallback(()=>{const r=new URLSearchParams(window.location.search);let e=!1,l=0;for(const[f,w]of Object.entries(c.current)){const m=r.getAll(f);if(m.length!==w?.length){e=!0;break}for(let d=0;d<m.length;d++)if(m[d]!==w[d]){e=!0;break}l+=1}if(e=e||a.current!==!1&&a.current!==l,e){h(),S();return}},[c,h,S]);s.useEffect(()=>(b.add(p),()=>{b.delete(p)}),[p]);const g=s.useMemo(()=>new Proxy({},{get(r,e){return o(e),n.getAll(e)},ownKeys(r){const e=new Set;return n.forEach((l,f)=>{e.add(f)}),u.current||(a.current=e.size),[...e]},getOwnPropertyDescriptor(r,e){return{configurable:!0,enumerable:!0,writable:!1}},has(r,e){return o(e),n.has(e)}}),[n]),v=s.useCallback((r,e=!1)=>{try{const l=new URL(window.location.href);u.current=!0;const f=r instanceof Function?r(g):r;u.current=!1,L(l,f,!0),e?window.history.replaceState(null,"",l):window.history.pushState(null,"",l)}catch(l){console.error("Error while setting query params",l)}u.current=!1},[g]);return[g,v]}export{y as u};
