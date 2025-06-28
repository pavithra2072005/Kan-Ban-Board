import React, {useState,useEffect,useContext,useReducer,useRef,createContext,useMemo,} from "react";
import "./kanbanBoard.css";

const KanbanContext = createContext();

const initialState = {
  todo: [],
  inProgress: [],
  done: [],
};

function kanbanReducer(state, action) {
  switch (action.type) {
    case "MOVE_CARD": {
      const { card, from, to } = action.payload;
      if(from === to) return state;
      return {
        ...state,
        [from]: state[from].filter((c) => c.id !== card.id),
        [to]: state[to].some(c => c.id === card.id) ? state[to] : [...state[to], card],
      };
    }
    case "ADD_TASK":{
      const newTask ={
        id:Date.now().toString(),
        text:action.payload.text
      };
      return {
        ...state,
        todo:[...state.todo,newTask]
      };
    }
    case "DELETE_TASK":{
      const{cardId,from} = action.payload;
      return{
        ...state,
        [from]: state[from].filter((card) => card.id !== cardId)
      }
    }
    case "EDIT_TASK": {
      const { cardId, newText, from } = action.payload;
      return {
        ...state,
        [from]: state[from].map((card) =>
          card.id === cardId ? { ...card, text: newText } : card
        ),
      };
    }
    case "REORDER_TASK": {
      const { from, sourceIndex, destinationIndex } = action.payload;
      const updatedColumn = [...state[from]];
      const [movedCard] = updatedColumn.splice(sourceIndex, 1);
      updatedColumn.splice(destinationIndex, 0, movedCard);
      return {
        ...state,
        [from]: updatedColumn,
      };
    }
    default:
      return state;
  }
}

function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

function TaskInput(){
  const {dispatch} = useContext(KanbanContext);
  const [text,setText] = useState("");

  const handleSubmit =(e) =>{
    e.preventDefault();
    if(!text.trim()) return;
    dispatch({type:'ADD_TASK',payload:{text}});
    setText("");
  };
  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input 
        type="text" className="task-input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add new task"/>  
      <button type="submit" className="add-btn">Add</button>
    </form>
  )
}

function Card({ card, from, index }) {
  const dragRef = useRef(null);
  const { dispatch } = useContext(KanbanContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(card.text);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ card, from, sourceIndex: index }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("application/json"));
    if (data.from === from && data.sourceIndex !== index) {
      dispatch({
        type: "REORDER_TASK",
        payload: {
          from,
          sourceIndex: data.sourceIndex,
          destinationIndex: index,
        },
      });
    }
  };

  const handleEdit = () => setIsEditing(true);
  const handleSave = () => {
    if (editText.trim()) {
      dispatch({
        type: "EDIT_TASK",
        payload: { cardId: card.id, newText: editText, from },
      });
      setIsEditing(false);
    }
  };

  return (
    <div
      className="card"
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isEditing ? (
        <>
          <input
            className="edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <button onClick={handleSave} className="save-btn">💾</button>
        </>
      ) : (
        <>
          <span>{card.text}</span>
          {from === "todo" && (
            <button onClick={handleEdit} className="edit-btn">✏️</button>
          )}
        </>
      )}
    </div>
  );
}

function Column({ title, columnKey, className }) {
  const { state, dispatch } = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;

    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("application/json"));

      if (!state[columnKey].length) {
        dispatch({
          type: "MOVE_CARD",
          payload: { card: data.card, from: data.from, to: columnKey },
        });
      }
    };

    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", handleDrop);
    return () => {
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, [dispatch, columnKey, state]);

  return (
    <div className={`column ${className}`} ref={dropRef}>
      <h2>{title}</h2>
      {state[columnKey].map((card, index) => (
        <Card key={card.id} card={card} from={columnKey} index={index} />
      ))}
    </div>
  );
}

function KanbanBoard() {
  return (
    <KanbanProvider>
      <div className="board-container">
        <TaskInput />
        <div className="board">
          <Column title="📝 To Do" columnKey="todo" className="column-red" />
          <Column title="⏳ In Progress" columnKey="inProgress" className="column-yellow" />
          <Column title="✅ Done" columnKey="done" className="column-green" />
          <TrashDropZone />
        </div>
      </div>
    </KanbanProvider>
  );
}

function TrashDropZone(){
  const {dispatch} = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;
    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const confirmDelete = window.confirm("Are you sure you want to delete this task?");
      if (confirmDelete) {
        dispatch({type: 'DELETE_TASK', payload: {cardId: data.card.id, from: data.from}});
      }
    }
    dropArea.addEventListener('dragover', e => e.preventDefault());
    dropArea.addEventListener('drop', handleDrop);
    return () => {
      dropArea.removeEventListener('drop', handleDrop);
    }
  }, [dispatch]);

  return (
    <div className="trash-drop-zone" ref={dropRef}>
      🗑<br/><span>Drop cards here to delete </span>
    </div>
  );
}

export default KanbanBoard;
