import React, { useState } from "react";
import axios from "axios";

const App = () => {
  const [file, setFile] = useState(null);
  const [inputContainsFile, setInputContainsFile] = useState(false);
  const [currentlyUploading, setCurrentlyUploading] = useState(false);
  const [videoId, setvideoId] = useState(null);
  const [progress, setProgress] = useState(null);

  const handleFile = (event) => {
    setFile(event.target.files[0]);
    setInputContainsFile(true);
  };

  const fileUploadHandler = () => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    axios
      .post(`http://localhost:8000/api/video/upload`, fd, {
        onUploadProgress: (progressEvent) => {
          setProgress((progressEvent.loaded / progressEvent.total) * 100);
          console.log(
            "upload progress: ",
            Math.round((progressEvent.loaded / progressEvent.total) * 100)
          );
        },
      })
      .then(({ data }) => {
        setvideoId(data);
        setFile(null);
        setInputContainsFile(false);
        setCurrentlyUploading(false);
      })
      .catch((err) => {
        console.log(err);
        if (err.response.status === 400) {
          const errMsg = err.response.data;
          if (errMsg) {
            console.log(errMsg);
            alert(errMsg);
          }
        } else if (err.response.status === 500) {
          console.log("db error");
          alert("db error");
        } else {
          console.log("other error: ", err);
        }
        setInputContainsFile(false);
        setCurrentlyUploading(false);
      });
  };

  const handleClick = () => {
    if (inputContainsFile) {
      setCurrentlyUploading(true);
      fileUploadHandler();
    }
  };
  return (
    <div className="regular">
      <div className="video-section">
        {videoId ? (
          <>
            <video id="videoPlayer" width="650" controls muted="muted" autoplay>
              <source
                src={`http://localhost:8000/api/video/${videoId}`}
                type="video/mp4"
              />
            </video>
            <a
              className="link"
              href={`http://localhost:8000/api/video/${videoId}`}
              target="_blank"
            >
              link
            </a>
          </>
        ) : (
          <p className="nopic">no regular version pic yet</p>
        )}
      </div>
      <div className="inputcontainer">
        {currentlyUploading ? (
          <p>uploading...</p>
        ) : (
          <>
            <input
              className="file-input"
              onChange={handleFile}
              type="file"
              name="file"
              id="file"
            />
            <label
              className={`inputlabel ${file && "file-selected"}`}
              htmlFor="file"
              onClick={handleClick}
            >
              {file ? <>SUBMIT</> : <>REGULAR VERSION</>}
            </label>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
