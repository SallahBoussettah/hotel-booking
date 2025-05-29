/**
 * Components.js - Utility for including reusable components in HTML pages
 */

// Function to load HTML components into specified elements
async function loadComponents() {
  // Load navbar
  const navbarElements = document.querySelectorAll('[data-component="navbar"]');
  if (navbarElements.length > 0) {
    const navbarResponse = await fetch('/client/components/navbar.html');
    const navbarHtml = await navbarResponse.text();
    
    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = navbarHtml;
    
    // Extract the header element from the navbar HTML
    const headerElement = tempContainer.querySelector('header');
    
    if (headerElement) {
      navbarElements.forEach(element => {
        element.innerHTML = headerElement.outerHTML;
      });
      
      // Execute the script from navbar
      const navbarScript = tempContainer.querySelector('script');
      if (navbarScript) {
        const newScript = document.createElement('script');
        newScript.textContent = navbarScript.textContent;
        document.body.appendChild(newScript);
      }
    }
  }
  
  // Load footer
  const footerElements = document.querySelectorAll('[data-component="footer"]');
  if (footerElements.length > 0) {
    const footerResponse = await fetch('/client/components/footer.html');
    const footerHtml = await footerResponse.text();
    
    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = footerHtml;
    
    // Extract the footer element from the footer HTML
    const footerElement = tempContainer.querySelector('footer');
    
    if (footerElement) {
      footerElements.forEach(element => {
        element.innerHTML = footerElement.outerHTML;
      });
    }
  }
}

// Load components when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadComponents); 