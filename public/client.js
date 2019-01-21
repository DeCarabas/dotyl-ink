// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('hello world :o');

let dreams = [];

// define variables that reference elements on our page
const urlsList = document.getElementById('urls');
const urlForm = document.forms[0];
const urlInput = urlForm.elements['url'];

// // a helper function to call when our request for dreams is done
// const getDreamsListener = function() {
//   // parse our response to convert to JSON
//   dreams = JSON.parse(this.responseText);

//   // iterate through every dream and add it to our page
//   dreams.forEach( function(row) {
//     appendNewDream(row.dream);
//   });
// }

// // request the dreams from our app's sqlite database
// const dreamRequest = new XMLHttpRequest();
// dreamRequest.onload = getDreamsListener;
// dreamRequest.open('get', '/getDreams');
// dreamRequest.send();

// listen for the form to be submitted and add a new dream when it is
urlForm.onsubmit = function(event) {
  console.log("HELLO!");
  
  // stop our form submission from refreshing the page
  event.preventDefault();

  // get dream value and add it to the list
  const urlRequest = new XMLHttpRequest();
  urlRequest.onload = () => {
    const response = JSON.parse(urlRequest.responseText);
    if (response.status == 'ok') {
      const link = response.link;
      const newListItem = document.createElement('li');
      newListItem.innerHTML = "<a href='/l/" + link.slug + "'>" + link.url + "</a>";
      urlsList.appendChild(newListItem);
      
      urlInput.value = '';
      urlInput.focus();
    } else {
      alert(response.errors);      
    }
  };
  urlRequest.open('post', '/link');
  urlRequest.setRequestHeader("Content-Type", "application/json");
  urlRequest.send(JSON.stringify({
    url: urlInput.value.trim(),
  }));
};
