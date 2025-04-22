"use client"

export default function SubmitButton() {
    function handleSubmit() {
        console.log("Sumit");
    }
    return (
        <div>
            <button onClick={handleSubmit} type="button" className="text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 font-medium rounded-full text-sm mt-5 px-5 py-2.5 text-center mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900">Submit</button>
        </div>
    )
}