import Weavy from '@weavy/dropin-js';

// init weavy
var weavy = window.weavy = new Weavy({
  url: weavy_url,
  tokenFactory: async (refresh) => {
    var response = await fetch('/token?refresh=' + (refresh || false));
    return await response.text();
  },
  tz: user_timezone || '',
  className: document.documentElement.dataset.bsTheme === 'dark' ? 'wy-dark' : ''
});

// listen to theme changes and update weavy accordingly
const observer = new MutationObserver((mutationList) => {
  mutationList.forEach((mutation) => {
    weavy.className = mutation.target.dataset.bsTheme === 'dark' ? 'wy-dark' : '';
  });
});
observer.observe(document.documentElement, { attributes: true });

// get DOM element where we want to render the Weavy messenger app
const messengerContainer = document.getElementById("messenger");
if (messengerContainer) {
  // load messenger
  var messenger = weavy.app({
    type: "messenger",
    container: messengerContainer,
    open: false, // app is initially closed
    badge: true // enable the badge plugin
  });

  // open/close messenger when container DOM element (bootstrap off-canvas) is shown/hidden 
  messengerContainer.addEventListener('show.bs.offcanvas', event => {
    messenger.open();
  });
  messengerContainer.addEventListener('hide.bs.offcanvas', event => {
    messenger.close();
  });

  // listen for badge event on messenger and update UI accordingly
  const messengerBadge = document.getElementById('messenger-badge');
  if (messengerBadge) {
    messenger.on('badge', (e, badge) => {
      // update ui with number of unread conversations
      messengerBadge.innerText = badge.count > 0 ? badge.count : '';
    });
  }
}

// load weavy contextual app(s)
const appContainers = document.querySelectorAll('.contextual-app[data-uid]');
appContainers.forEach((appContainer) => {
  weavy.app({
    uid: appContainer.dataset.uid,
    container: appContainer
  });
});

// connect to signalr hub for realtime events
var connection = new signalR.HubConnectionBuilder().withUrl('/hub').build();

// listen to notification event
connection.on('notification', function (id) {
  console.log('received notification:', id);

  // display notification to user
  weavy.fetch(`/api/notifications/${id}`).then(data => {
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
