import { Weavy, Messenger, Chat, Files, Posts } from '@weavy/dropin-js';

console.log("Configuring ACME Weavy");

//Weavy.defaults.console.log = true; // Enable additional logging
Weavy.defaults.className = document.documentElement.dataset.bsTheme === 'dark' ? 'wy-dark' : '';

// Expose Weavy to inline scripts
window.Weavy = Weavy;

// init weavy
Weavy.tz = user_timezone || '';
Weavy.url = weavy_url;
Weavy.tokenFactory = async (refresh) => {
  var response = await fetch('/token?refresh=' + (refresh || false));
  return await response.text();
};

// listen to theme changes and update weavy accordingly
const observer = new MutationObserver((mutationList) => {
  mutationList.forEach((mutation) => {
    let isDark = mutation.target.dataset.bsTheme === 'dark';
    const apps = document.querySelectorAll('weavy-posts, weavy-messenger, weavy-chat, weavy-files');
    apps.forEach((app) => isDark ? app.classList.add("wy-dark") : app.classList.remove("wy-dark")); 
  });
});
observer.observe(document.documentElement, { attributes: true });

// get DOM element where we want to render the Weavy messenger app
const messengerContainer = document.getElementById("messenger");
if (messengerContainer) {
  // load messenger
  const messenger = new Messenger({
    load: false // app is initially unloaded
  });

  // Set dark theme className for the messenger
  if (document.documentElement.dataset.bsTheme === 'dark') {
    messenger.classList.add("wy-dark");
  } 

  // Add the messenger to the DOM
  messengerContainer.append(messenger);

  // load messenger when container DOM element (bootstrap off-canvas) is shown 
  messengerContainer.addEventListener('show.bs.offcanvas', event => {
    messenger.load();
  });

  // listen for badge event on messenger and update UI accordingly
  const messengerBadge = document.getElementById('messenger-badge');
  if (messengerBadge) {
    messenger.on('badge', (badge) => {
      // update ui with number of unread conversations
      messengerBadge.innerText = badge.count > 0 ? badge.count : '';
    });
  }
}

// connect to signalr hub for realtime events
var connection = new signalR.HubConnectionBuilder().withUrl('/hub').build();

// listen to notification event
connection.on('notification', function (id) {
  console.log('received notification:', id);

  // display notification to user
  Weavy.fetch(`/api/notifications/${id}`).then(data => {
    console.log('notification', data.text);

    const toastContainer = document.getElementById('toasts');
    const toastTemplate = document.getElementById('toast');

    if (toastContainer && toastTemplate) {
      const clone = toastTemplate.content.firstElementChild.cloneNode(true);
      const toastBody = clone.querySelector('.toast-body');
      toastBody.innerText = data.plain;
      toastContainer.appendChild(clone);
      const toast = new bootstrap.Toast(clone);
      toast.show();
    }

  });
});

connection.start().then(function () {
  console.log('connected');
}).catch(function (err) {
  return console.error(err.toString());
});
