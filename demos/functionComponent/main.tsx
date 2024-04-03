import { useState } from 'react';
import ReactDOM from 'react-dom';

const App = () => (
    <div>
        <HelloWorld />
    </div>
);

const HelloWorld = () => {
    const [num, setNum] = useState(100);
    return (
        <span
            onClick={() => {
                setNum((num) => num + 1);
                setNum((num) => num + 1);
                setNum((num) => num + 1);
            }}
        >
            {num}
        </span>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
