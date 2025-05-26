function TestComponent() {
    return (
      <div className="p-4">
        <h1 className="text-3xl font-bold text-blue-500">
          Tailwind Test
        </h1>
        <p className="mt-2 text-gray-600">
          If you can see this text in gray and the heading above in blue, Tailwind is working!
        </p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Test Button
        </button>
      </div>
    );
  }
  
  export default TestComponent;