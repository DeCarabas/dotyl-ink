// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('hello world :o');

let dreams = [];

// define variables that reference elements on our page
const urlsList = document.getElementById('urls');
const urlForm = document.forms[0];
const userInput = urlForm.elements['user'];
const passwordInput = urlForm.elements['password'];
const urlInput = urlForm.elements['url'];

// a helper function to call when our request for dreams is done
const getLinksListener = function() {
  const response = JSON.parse(this.responseText);  
  response.links.reverse();
  response.links.forEach((link) => {
    appendNewLink(link);
  });
}

const dreamRequest = new XMLHttpRequest();
dreamRequest.onload = getLinksListener;
dreamRequest.open('get', '/link');
dreamRequest.send();

function appendNewLink(link) {
  const newListItem = document.createElement('li');
  newListItem.innerHTML = "<a href='" + link.short + "'>" + link.url + "</a>";
  console.log(urlsList.firstChild);
  urlsList.insertBefore(newListItem, urlsList.firstChild);
}

// listen for the form to be submitted and add a new dream when it is
urlForm.onsubmit = function(event) {  
  // stop our form submission from refreshing the page
  event.preventDefault();

  // get dream value and add it to the list
  const urlRequest = new XMLHttpRequest();
  urlRequest.onload = () => {
    const response = JSON.parse(urlRequest.responseText);
    if (response.status == 'ok') {
      const link = response.link;
      appendNewLink(link);
      
      urlInput.value = '';
      urlInput.focus();
    } else {
      console.log(response.errors);
    }
  };
  urlRequest.open('post', '/link');
  urlRequest.setRequestHeader("Content-Type", "application/json");
  urlRequest.send(JSON.stringify({
    user: userInput.value.trim(),
    password: userInput.value.trim(),
    url: urlInput.value.trim(),
  }));
};
