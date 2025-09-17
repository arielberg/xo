class MyPage {
    constructor(args) {
        this.args = args;
        console.log('Constructed with:', args);
    }
    
    setPage() {
        const h1 = document.createElement('h1');
        h1.textContent = 'My Page Title';
        h1.style.color = 'blue';
        document.body.appendChild(h1);
        
        const p = document.createElement('p');
        p.textContent = `Args: ${this.args.join(', ')}`;
        document.body.appendChild(p);
    }
}

// ---------- app object for AppsRegistry ----------
export default {
    name: 'JS Executer',
    onLoad() {
      // no-op
    },
    onMessage(data, { from }) {
    
    }
  };