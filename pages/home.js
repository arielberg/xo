export async function run(containerId = 'content') {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="container mt-5">
        <h1>Web 3.0 App</h1>
        
      </div>
    `;
}