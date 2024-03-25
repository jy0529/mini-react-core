import { useState } from 'react';
import ReactDOM from 'react-dom';

const App = () => (
    <div>
        <HelloWorld />
    </div>
);

const HelloWorld = () => {
    const [num, setNum] = useState(100);
    window.setNum = setNum;
    return num === 3 ? <span>HelloA</span> : <span>{num}</span>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
