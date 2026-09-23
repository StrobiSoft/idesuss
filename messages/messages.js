const SUPABASE_URL="https://aypymehochdhcisgkowy.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_1Ek9_3audYdKlguLegBm-Q_2i4S-W3G";
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=(s)=>document.querySelector(s);
let me=null,currentOther=null,currentThread=null,dmChannel=null,friendChannel=null;

function setText(el,v){if(el)el.textContent=v??""}
function fmtDate(v){if(!v)return"";return new Intl.DateTimeFormat("hu-HU",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}
function roleLabel(r){return({owner:"Platform Owner",admin:"Admin",moderator:"Moderátor",user:"Felhasználó"})[r]||r||"Felhasználó"}

function showTab(which){
  const messages=which==="messages";
  $("#messagesPanel").hidden=!messages; $("#friendsPanel").hidden=messages;
  $("#messagesTab").classList.toggle("active",messages); $("#friendsTab").classList.toggle("active",!messages);
  if(!messages) loadFriendships();
}
$("#messagesTab").addEventListener("click",()=>showTab("messages"));
$("#friendsTab").addEventListener("click",()=>showTab("friends"));

async function loadThreads(){
  const list=$("#threadList"); list.replaceChildren();
  const {data,error}=await client.rpc("list_message_threads");
  if(error){setText(list,"A beszélgetések nem tölthetők be.");return}
  if(!(data||[]).length){setText(list,"Még nincs üzeneted.");return}
  for(const t of data){
    const b=document.createElement("button"); b.className="thread"+(currentOther===t.other_id?" active":""); b.type="button";
    const top=document.createElement("div"); top.className="thread-top";
    const name=document.createElement("span"); name.className="thread-name"; name.textContent=(t.other_avatar_emoji||"🙂")+" "+(t.other_nickname||"Felhasználó");
    top.append(name);
    if(Number(t.unread_count)>0){const u=document.createElement("span");u.className="unread";u.textContent=t.unread_count;top.append(u)}
    const preview=document.createElement("div");preview.className="muted";preview.textContent=t.last_message_type==="friend_request"?"Barátkozási kérés":t.last_message_body;
    const date=document.createElement("div");date.className="message-meta";date.textContent=fmtDate(t.last_message_at);
    b.append(top,preview,date); b.addEventListener("click",()=>openConversation(t));
    list.append(b);
  }
}

async function openConversation(t){
  currentOther=t.other_id;currentThread=t;
  setText($("#conversationHead"),(t.other_avatar_emoji||"🙂")+" "+(t.other_nickname||"Felhasználó"));
  $("#messageInput").disabled=false;$("#sendMessageBtn").disabled=false;
  await client.rpc("mark_direct_messages_read",{p_sender:currentOther}).catch(()=>{});
  await Promise.all([loadConversation(),loadThreads()]);
}

async function loadConversation(){
  if(!currentOther)return;
  const list=$("#messageList");list.replaceChildren();
  const {data,error}=await client.rpc("list_direct_conversation",{p_other:currentOther,p_limit:200});
  if(error){setText(list,"A beszélgetés nem tölthető be.");return}
  for(const m of data||[]){
    const mine=m.sender_id===me.id;
    const bubble=document.createElement("div");
    bubble.className="bubble "+(m.message_type==="friend_request"?"system":mine?"mine":"");
    if(m.message_type==="friend_request"){
      const title=document.createElement("strong");title.textContent=mine?"Barátkozási kérést küldtél.":"Barátlistára szeretne felvenni.";
      const status=document.createElement("div");status.className="message-meta";
      status.textContent=({pending:"Válaszra vár.",later:"Talán — későbbi döntésre vár.",accepted:"Elfogadva.",declined:"Elutasítva."})[m.friendship_status]||m.friendship_status||"";
      bubble.append(title,status);
      if(!mine&&["pending","later"].includes(m.friendship_status)){
        const actions=document.createElement("div");actions.className="friend-actions";
        [["Igen","accepted","yes"],["Nem","declined","no"],["Talán","later","later"]].forEach(([label,value,cls])=>{
          const btn=document.createElement("button");btn.type="button";btn.className=cls;btn.textContent=label;
          btn.addEventListener("click",()=>respondFriendship(m.friendship_id,value));
          actions.append(btn);
        });
        bubble.append(actions);
      }
    }else{
      const body=document.createElement("div");body.textContent=m.body;
      const meta=document.createElement("div");meta.className="message-meta";meta.textContent=fmtDate(m.created_at);
      bubble.append(body,meta);
    }
    list.append(bubble);
  }
  list.scrollTop=list.scrollHeight;
}

async function respondFriendship(id,decision){
  const {error}=await client.rpc("respond_friendship",{p_friendship_id:id,p_decision:decision});
  if(error){alert("A válasz mentése nem sikerült: "+error.message);return}
  await Promise.all([loadConversation(),loadFriendships(),loadThreads()]);
}

$("#sendMessageBtn").addEventListener("click",async()=>{
  const input=$("#messageInput"),body=input.value.trim();
  if(!currentOther||!body)return;
  $("#sendMessageBtn").disabled=true;
  const {error}=await client.rpc("send_direct_message",{p_recipient:currentOther,p_body:body});
  $("#sendMessageBtn").disabled=false;
  if(error){
    const raw=error.message||"";
    if(raw.includes("ENTITLEMENT_REQUIRED:PREMIUM")) alert("Privát üzenet küldéséhez Premium tagság szükséges.");
    else if(raw.includes("FRIENDSHIP_REQUIRED")) alert("Ezzel a tagsági szinttel csak barátoknak küldhetsz privát üzenetet.");
    else alert("Az üzenet nem küldhető el: "+raw);
    return;
  }
  input.value="";await Promise.all([loadConversation(),loadThreads()]);
});
$("#messageInput").addEventListener("keydown",(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#sendMessageBtn").click()}});

async function searchFriends(){
  const q=$("#friendSearchInput").value.trim(),status=$("#friendSearchStatus"),results=$("#friendSearchResults");
  results.replaceChildren();
  if(q.length<2){setText(status,"Írj be legalább 2 karaktert.");return}
  setText(status,"Keresés…");
  const {data,error}=await client.rpc("search_social_users",{p_query:q,p_limit:20});
  if(error){setText(status,"A keresés nem sikerült.");return}
  setText(status,(data||[]).length?((data||[]).length+" találat."):"Nincs találat.");
  for(const user of data||[]){
    const row=document.createElement("div");row.className="person";
    const info=document.createElement("div");info.innerHTML='<span class="avatar"></span><strong></strong><div class="muted"></div>';
    info.querySelector(".avatar").textContent=user.avatar_emoji||"🙂";
    info.querySelector("strong").textContent=user.nickname||"Felhasználó";
    info.querySelector(".muted").textContent=roleLabel(user.role);
    const btn=document.createElement("button");btn.className="action";btn.type="button";btn.textContent="Barátnak jelölés";
    btn.addEventListener("click",async()=>{
      btn.disabled=true;
      const {error:reqError}=await client.rpc("request_friendship",{p_addressee:user.id});
      if(reqError){
        const raw=reqError.message||"";
        setText(status,raw.includes("FRIENDSHIP_ALREADY_EXISTS")?"Már van kapcsolat vagy függő kérés ezzel a felhasználóval.":"A kérés nem küldhető el: "+raw);
      }else{
        setText(status,"Barátkozási kérés elküldve.");
        await Promise.all([loadFriendships(),loadThreads()]);
      }
      btn.disabled=false;
    });
    row.append(info,btn);results.append(row);
  }
}
$("#friendSearchBtn").addEventListener("click",searchFriends);
$("#friendSearchInput").addEventListener("keydown",(e)=>{if(e.key==="Enter")searchFriends()});

async function loadFriendships(){
  const list=$("#friendshipsList");list.replaceChildren();
  const {data,error}=await client.rpc("list_my_friendships");
  if(error){setText(list,"A barátlista nem tölthető be.");return}
  if(!(data||[]).length){setText(list,"Még nincs kapcsolatod.");return}
  for(const f of data){
    const row=document.createElement("div");row.className="person";
    const info=document.createElement("div");
    const title=document.createElement("strong");title.textContent=(f.other_avatar_emoji||"🙂")+" "+(f.other_nickname||"Felhasználó");
    const meta=document.createElement("div");meta.className="muted";
    let label="";
    if(f.status==="accepted")label="Barát";
    else if(f.status==="pending"&&f.direction==="incoming")label="Beérkező kérés";
    else if(f.status==="pending")label="Elküldött kérés";
    else if(f.status==="later"&&f.direction==="incoming")label="Talán — későbbi döntés";
    else if(f.status==="later")label="A másik fél később dönt";
    else if(f.status==="declined")label="Elutasítva";
    else label=f.status;
    meta.textContent=label;info.append(title,meta);
    const actions=document.createElement("div");actions.className="friend-actions";
    if(["pending","later"].includes(f.status)&&f.direction==="incoming"){
      [["Igen","accepted","yes"],["Nem","declined","no"],["Talán","later","later"]].forEach(([txt,val,cls])=>{
        const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=txt;b.addEventListener("click",()=>respondFriendship(f.friendship_id,val));actions.append(b);
      });
    }
    if(f.status==="accepted"){
      const msg=document.createElement("button");msg.type="button";msg.textContent="Üzenet";msg.addEventListener("click",async()=>{showTab("messages");await openConversation({other_id:f.other_id,other_nickname:f.other_nickname,other_avatar_emoji:f.other_avatar_emoji});});actions.append(msg);
    }
    const remove=document.createElement("button");remove.type="button";remove.textContent=f.status==="accepted"?"Barátság megszüntetése":"Kérés törlése";remove.addEventListener("click",async()=>{if(!confirm("Biztosan törlöd ezt a kapcsolatot?"))return;const {error:rmError}=await client.rpc("remove_friendship",{p_friendship_id:f.friendship_id});if(rmError)alert(rmError.message);else await Promise.all([loadFriendships(),loadThreads()]);});actions.append(remove);
    row.append(info,actions);list.append(row);
  }
}

function subscribeRealtime(){
  if(dmChannel)client.removeChannel(dmChannel); if(friendChannel)client.removeChannel(friendChannel);
  dmChannel=client.channel("idesuss-dm-live")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`recipient_id=eq.${me.id}`},async()=>{await loadThreads();if(currentOther)await loadConversation()})
    .subscribe();
  friendChannel=client.channel("idesuss-friend-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"friendships"},async()=>{await loadFriendships();await loadThreads();if(currentOther)await loadConversation()})
    .subscribe();
}

async function boot(){
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user){$("#authRequired").hidden=false;$("#messagesPanel").hidden=true;return}
  me=data.user;
  await Promise.all([loadThreads(),loadFriendships()]);
  subscribeRealtime();
}
boot();