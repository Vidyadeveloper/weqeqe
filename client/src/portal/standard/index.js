// Import the portal template component
import "/node_modules/@blaze-case-ai/blaze-engine/client/src/portal/standard-back-office-portal/index.js";

window.addEventListener("DOMContentLoaded", () => {
  // Create the portal template component
  const portalComponent = document.createElement("portal-template-component");

  // Add any specific content that needs to be inserted into the portal
  const content = document.createElement("div");
  content.innerHTML = `
        <h2>BUK Worklist</h2>
        <p>This is the worklist content for BUK.</p>
    `;

  // Append the content to the portal component
  portalComponent.appendChild(content);

  // Append the portal component to the body of the document
  document.body.appendChild(portalComponent);
});
