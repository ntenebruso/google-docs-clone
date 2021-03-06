import { useCallback, useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import Quill from "quill";
import "quill/dist/quill.snow.css";
import io from "socket.io-client";
import '../style.css';
import { useHistory } from "react-router-dom";

import { Layout, Button, Typography, PageHeader, Descriptions, message } from "antd";

const { Title } = Typography;

const TOOLBAR_OPTIONS = [
    [{ size: [] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "link", "code-block"],
    ["clean"],
]

function TextEditor() {
    const history = useHistory();
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();
    const [documentFound, setDocumentFound] = useState(true);
    const [documentTitle, setDocumentTitle] = useState();
    const [documentSaving, setDocumentSaving] = useState(false);
    const { id: documentId } = useParams();

    useEffect(() => {
        const socketState = io('ws://localhost:3001');
        setSocket(socketState);
    }, [])

    useEffect(() => {
        if (socket == null) return;

        socket.once("load-document", document => {
            quill.enable();
            quill.setContents(document.data);
            setDocumentTitle(document.name);
        });

        socket.once("document-not-found", () => {
            setDocumentFound(false);
        })

        socket.emit("get-document", documentId);
    }, [socket, documentId])

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = delta => {
            quill.updateContents(delta);
        }

        socket.on("receive-changes", handler);

        return () => {
            socket.off("receive-changes", handler);
        }
    }, [socket, quill, documentId])

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return;
            socket.emit("send-changes", delta);
        }

        quill.on("text-change", handler);

        return () => {
            quill.off("text-change", handler)
        }
    }, [socket, quill, documentId])

    const wrapperRef = useCallback(wrapper => {
        if (wrapper == null) return
        wrapper.innerHTML = '';
        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, { theme: 'snow', modules: { toolbar: TOOLBAR_OPTIONS } });
        q.disable();
        q.setText("Loading...");
        setQuill(q);

        q.getModule("toolbar").container.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });
    }, []);

    async function saveDocument() {
        socket.emit('save-document', quill.getContents());
        setDocumentSaving(true);
        socket.once("save-successful", () => {
            setDocumentSaving(false)
            message.success("Document saved successfully");
        });
    }

    if (documentFound) {
        return (
            <Layout>
                <PageHeader
                    title={documentTitle}
                    extra={[
                        <Button loading={documentSaving} onClick={saveDocument} type="primary">Save Document</Button>
                    ]}
                    ghost={false}
                    onBack={() => history.push("/")}
                >
                    <Descriptions size="small">
                        <Descriptions.Item label="Author">Nick Tenebruso</Descriptions.Item>
                    </Descriptions>
                </PageHeader>
                <div className="container" ref={wrapperRef}></div>
            </Layout>
        );
    } else {
        return (
            <div>Document was not found</div>
        )
    }

}

export default TextEditor;