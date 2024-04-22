import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { useEffect } from "react";
import { dynamicActivate, defaultLocale } from "./i18n";
import { getStoredSelectedLocal } from "./components/layout/LocaleSelect";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
// import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/App.scss";
import "katex/dist/katex.css";
import { Root } from "./components/navigation/Root";
import { QuizPage } from "./pages/QuizPage";
import { Activate } from "./Activate";
// import { RunningQuizTab } from "./components/tabs/RunningQuizTab";
import { QuestionEdit } from "./pages/QuestionEdit";
import { CreateQuiz } from "./pages/CreateQuiz";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Login />,
    },
    {
        path: "/activate",
        element: <Activate />,
    },
    {
        path: "/Dashboard",
        element: <Root />,
        // errorElement: <ErrorPage />,
        children: [
            {
                path: "/Dashboard",
                element: <Dashboard />,
            },
            {
                path: "/Dashboard/Quiz",
                element: <QuizPage />,
            },
            {
                path: "/Dashboard/Question",
                element: <QuestionEdit />,
            },
            {
                path: "/Dashboard/CreateQuiz",
                element: <CreateQuiz />,
            },
        ],
    },
]);

const App: React.FC = () => {
    useEffect(() => {
        const storedLocal = getStoredSelectedLocal();

        if (storedLocal) {
            dynamicActivate(storedLocal);
        } else {
            dynamicActivate(defaultLocale);
        }
    }, []);
    return (
        <I18nProvider i18n={i18n}>
            <RouterProvider router={router} />
        </I18nProvider>
    );
};

export default App;
