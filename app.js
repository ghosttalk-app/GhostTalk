// ------------------------
// Firebase Config
// ------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDpMu5t_Bihw_WCBFXRtYE1vLnlNqkCxn0",
  authDomain: "ghosttalk-486ac.firebaseapp.com",
  databaseURL: "https://ghosttalk-486ac-default-rtdb.firebaseio.com",
  projectId: "ghosttalk-486ac",
  storageBucket: "ghosttalk-486ac.appspot.com",
  messagingSenderId: "4397493609",
  appId: "1:4397493609:web:11dd8763205f7f2cbe61f8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// ------------------------
// DOM Elements
// ------------------------
const lamp = document.getElementById('lamp');
const loginForm = document.getElementById('loginForm');
const clickSound = document.getElementById('clickSound');

const displayNameInput = document.getElementById('displayName');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatarInput');

const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const themeSwitch = document.getElementById('themeSwitch');

const chatContainer = document.getElementById('chatContainer');
const logoutBtn = document.getElementById('logoutBtn');

const globalTab = document.getElementById('globalTab');
const groupTab = document.getElementById('groupTab');
const privateTab = document.getElementById('privateTab');

const globalChat = document.getElementById('globalChat');
const groupChat = document.getElementById('groupChat');
const privateChat = document.getElementById('privateChat');

const globalMessages = document.getElementById('globalMessages');
const groupMessages = document.getElementById('groupMessages');
const privateMessages = document.getElementById('privateMessages');

const globalInput = document.getElementById('globalInput');
const groupInput = document.getElementById('groupInput');
const privateInput = document.getElementById('privateInput');

const sendGlobalBtn = document.getElementById('sendGlobalBtn');
const sendGroupBtn = document.getElementById('sendGroupBtn');
const sendPrivateBtn = document.getElementById('sendPrivateBtn');

const roomInput = document.getElementById('roomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const currentRoomTitle = document.getElementById('currentRoomTitle');

const userList = document.getElementById('userList');

// Emoji pickers
const globalEmoji = document.getElementById('globalEmoji');
const groupEmoji = document.getElementById('groupEmoji');
const privateEmoji = document.getElementById('privateEmoji');

// File inputs
const globalFile = document.getElementById('globalFile');
const groupFile = document.getElementById('groupFile');
const privateFile = document.getElementById('privateFile');

// ------------------------
// Global Variables
// ------------------------
let currentUser = null;
let currentRoom = null;
let privateChatUser = null;
let adminUID = "ADMIN_USER_UID"; // Replace with admin UID after creating account
let scheduledMessages = []; // to track scheduled messages

// ------------------------
// Lamp Login Toggle
// ------------------------
let lampOn = false;
function toggleLamp() {
  lampOn = !lampOn;
  clickSound.play();
  if(lampOn) {
    loginForm.classList.add('active');
    document.body.style.backgroundColor = '#1c1f24';
  } else {
    loginForm.classList.remove('active');
    document.body.style.backgroundColor = '#121417';
  }
}

// ------------------------
// Theme Toggle
// ------------------------
themeSwitch.addEventListener('change', () => {
  document.body.classList.toggle('light-mode', themeSwitch.checked);
});

// ------------------------
// Signup
// ------------------------
signupBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const displayName = displayNameInput.value.trim();
  if(!email || !password || !displayName) return alert('All fields required');

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    currentUser = userCredential.user;

    let avatarURL = '';
    if(avatarInput.files[0]) {
      const avatarFile = avatarInput.files[0];
      const storageRef = storage.ref().child(`avatars/${currentUser.uid}`);
      await storageRef.put(avatarFile);
      avatarURL = await storageRef.getDownloadURL();
    }

    await db.ref(`users/${currentUser.uid}`).set({
      displayName,
      avatar: avatarURL,
      status: 'online',
      isAdmin: currentUser.uid === adminUID
    });

    afterLogin();
  } catch(err) { alert(err.message); }
});

// ------------------------
// Login
// ------------------------
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    currentUser = userCredential.user;

    await db.ref(`users/${currentUser.uid}/status`).set('online');
    afterLogin();
  } catch(err) { alert(err.message); }
});

// ------------------------
// After Login Setup
// ------------------------
function afterLogin() {
  loginForm.style.display = 'none';
  chatContainer.style.display = 'flex';
  loadUsers();
  loadGlobalMessages();
  loadGroupRooms();
  checkScheduledMessages();
}

// ------------------------
// Logout
// ------------------------
logoutBtn.addEventListener('click', async () => {
  if(currentUser){
    await db.ref(`users/${currentUser.uid}/status`).set('offline');
    auth.signOut();
    chatContainer.style.display = 'none';
    loginForm.style.display = 'block';
    currentUser = null;
  }
});

// ------------------------
// Bottom Tab Navigation
// ------------------------
function setActiveTab(tab) {
  [globalChat, groupChat, privateChat].forEach(v => v.style.display = 'none');
  [globalTab, groupTab, privateTab].forEach(b => b.classList.remove('activeTab'));
  if(tab==='global'){ globalChat.style.display='flex'; globalTab.classList.add('activeTab'); }
  else if(tab==='group'){ groupChat.style.display='flex'; groupTab.classList.add('activeTab'); }
  else if(tab==='private'){ privateChat.style.display='flex'; privateTab.classList.add('activeTab'); }
}
globalTab.addEventListener('click',()=>setActiveTab('global'));
groupTab.addEventListener('click',()=>setActiveTab('group'));
privateTab.addEventListener('click',()=>setActiveTab('private'));

// ------------------------
// Load Users (Private Chat List)
// ------------------------
function loadUsers() {
  db.ref('users').on('value', snapshot=>{
    userList.innerHTML='';
    snapshot.forEach(child=>{
      const user = child.val();
      if(child.key!==currentUser.uid){
        const div=document.createElement('div');
        div.classList.add('userItem');
        div.textContent=user.displayName||'Anonymous';
        div.addEventListener('click',()=>{
          privateChatUser={uid:child.key, displayName:user.displayName};
          setActiveTab('private');
          loadPrivateMessages();
        });
        userList.appendChild(div);
      }
    });
  });
}

// ------------------------
// Global Chat
// ------------------------
function loadGlobalMessages(){
  db.ref('global').on('child_added', snapshot=>{
    appendMessage(globalMessages, snapshot.val());
  });
}
sendGlobalBtn.addEventListener('click',async ()=>{
  const text = globalInput.value.trim();
  if(!text) return;
  await sendMessage('global', text, globalFile.files[0]);
  globalInput.value=''; globalFile.value='';
});

// ------------------------
// Group Chat
// ------------------------
joinRoomBtn.addEventListener('click',()=>{
  const roomName=roomInput.value.trim();
  if(!roomName) return alert('Enter room name');
  currentRoom=roomName;
  currentRoomTitle.textContent=`Room: ${roomName}`;
  setActiveTab('group');
  loadGroupMessages(roomName);
});

async function loadGroupRooms(){
  db.ref('rooms').on('value',snapshot=>{
    // optional: display all rooms somewhere
  });
}

function loadGroupMessages(room){
  db.ref(`rooms/${room}/messages`).on('child_added',snapshot=>{
    appendMessage(groupMessages,snapshot.val());
  });
}
sendGroupBtn.addEventListener('click',async ()=>{
  const text=groupInput.value.trim();
  if(!text) return;
  if(!currentRoom) return alert('Join a room first');
  await sendMessage(`rooms/${currentRoom}/messages`, text, groupFile.files[0]);
  groupInput.value=''; groupFile.value='';
});

// ------------------------
// Private Chat
// ------------------------
function loadPrivateMessages(){
  if(!privateChatUser) return;
  const chatKey = getPrivateKey(currentUser.uid, privateChatUser.uid);
  db.ref(`private/${chatKey}`).on('child_added', snapshot=>{
    appendMessage(privateMessages, snapshot.val());
    if(snapshot.val().sender!==currentUser.uid){
      notifyUser(snapshot.val());
    }
  });
}
sendPrivateBtn.addEventListener('click',async ()=>{
  if(!privateChatUser) return alert('Select user first');
  const text = privateInput.value.trim();
  if(!text) return;
  const chatKey = getPrivateKey(currentUser.uid, privateChatUser.uid);
  await sendMessage(`private/${chatKey}`, text, privateFile.files[0]);
  privateInput.value=''; privateFile.value='';
});
function getPrivateKey(uid1, uid2){
  return [uid1,uid2].sort().join('_');
}

// ------------------------
// Send Message Helper
// ------------------------
async function sendMessage(path, text, file=null){
  let fileURL='';
  if(file){
    const storageRef = storage.ref().child(`files/${currentUser.uid}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    fileURL = await storageRef.getDownloadURL();
  }
  const msgObj={
    sender: currentUser.uid,
    displayName: displayNameInput.value||'Anonymous',
    text,
    fileURL,
    timestamp: Date.now(),
    reactions:{},
  };
  await db.ref(path).push(msgObj);
}

// ------------------------
// Append Message Helper
// ------------------------
function appendMessage(container,msg){
  const div=document.createElement('div');
  div.classList.add('message');
  if(msg.sender===currentUser.uid) div.classList.add('self');
  div.innerHTML=`<strong>${msg.displayName}</strong>: ${msg.text || ''} 
  ${msg.fileURL?`<a href="${msg.fileURL}" target="_blank">[File]</a>`:''}
  <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>`;
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
}

// ------------------------
// Emoji Pickers
// ------------------------
globalEmoji.addEventListener('emoji-click', e=>{ globalInput.value+=e.detail.unicode; });
groupEmoji.addEventListener('emoji-click', e=>{ groupInput.value+=e.detail.unicode; });
privateEmoji.addEventListener('emoji-click', e=>{ privateInput.value+=e.detail.unicode; });

// ------------------------
// Scheduled Messages
// ------------------------
function checkScheduledMessages(){
  db.ref('scheduledMessages').on('child_added', snapshot=>{
    const msg = snapshot.val();
    const now = Date.now();
    if(msg.timestamp <= now){
      sendMessage(msg.path, msg.text, null);
      snapshot.ref.remove();
    } else {
      const delay = msg.timestamp - now;
      setTimeout(async ()=>{ await sendMessage(msg.path,msg.text,null); snapshot.ref.remove(); }, delay);
    }
  });
}

// ------------------------
// Notifications
// ------------------------
function notifyUser(msg){
  if(Notification.permission!=='granted') Notification.requestPermission();
  else new Notification(`${msg.displayName} sent a message`, {body: msg.text});
}

// ------------------------
// Admin Tools & Reports
// ------------------------
function reportMessage(path,msgId){
  db.ref('reports').push({reporter:currentUser.uid,path,msgId,timestamp:Date.now()});
}
function deleteMessage(path,msgId){
  if(currentUser.uid===adminUID) db.ref(`${path}/${msgId}`).remove();
}
function blockUser(uid){
  db.ref(`users/${currentUser.uid}/blocked/${uid}`).set(true);
}

// ------------------------
// Typing Indicators
// ------------------------
function setTyping(path,typing=true){
  db.ref(`${path}_typing/${currentUser.uid}`).set(typing?true:null);
}
// Example: bind to input events in each chat

// ------------------------
// Reactions
// ------------------------
function reactMessage(path,msgId,emoji){
  db.ref(`${path}/${msgId}/reactions/${currentUser.uid}`).set(emoji);
}

// ------------------------
// Read Receipts
// ------------------------
function setRead(path,msgId){
  db.ref(`${path}/${msgId}/read/${currentUser.uid}`).set(true);
}

// ------------------------
// Message Editing/Deleting (for own messages)
// ------------------------
async function editMessage(path,msgId,newText){
  const snapshot = await db.ref(`${path}/${msgId}`).once('value');
  if(snapshot.val().sender===currentUser.uid) db.ref(`${path}/${msgId}/text`).set(newText);
}
async function deleteOwnMessage(path,msgId){
  const snapshot = await db.ref(`${path}/${msgId}`).once('value');
  if(snapshot.val().sender===currentUser.uid) db.ref(`${path}/${msgId}`).remove();
}
