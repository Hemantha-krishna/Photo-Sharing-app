/**
 * fetchModel - Fetch a model from the web server.
 *
 * @param {string} url      The URL to issue the GET request.
 *
 * @returns a Promise that should be filled with the response of the GET request
 * parsed as a JSON object and returned in the property named "data" of an
 * object. If the request has an error, the Promise should be rejected with an
 * object that contains the properties:
 * {number} status          The HTTP response status
 * {string} statusText      The statusText from the response
 */
function fetchModel(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          // If the response status is not in the range of 200-299
          const error = new Error(response.statusText); // Create a new Error object
          error.status = response.status; // Attach the status
          return reject(error); // Reject with the Error object
        }
        return response.json(); // Parse the response as JSON
      })
      .then((data) => {
        resolve({ data }); // Resolve the promise with the data
      })
      .catch((error) => {
        const rejectError = new Error(error.message || "Network Error"); // Create an Error object for network errors
        rejectError.status = error.status || 500; // Default to 500 if no status
        reject(rejectError); // Reject with the Error object
      });
  });
}

export default fetchModel;
