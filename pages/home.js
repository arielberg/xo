export async function run(containerId = 'content') {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="container mt-5">
        <h1>Web 3.0 App</h1>
        <p>Welcome to the Web 3.0 application. <br/>
        Use the navigation to manage users and settings.</p>
      </div>
    `;
}