import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/tasks")
      .then(res => setTasks(res.data));
  }, []);



  return (
    <div>
      <h1>Mystic Minds Tasks</h1>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Add a task"
      />


      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
