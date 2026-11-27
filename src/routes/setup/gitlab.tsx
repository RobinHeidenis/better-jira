import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardTitle } from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "#/components/ui/questionnaire";
import { Spinner } from "#/components/ui/spinner";
import { gitlabProjectsOptions } from "#/lib/api/gitlab";
import { store } from "#/lib/store";

export const Route = createFileRoute("/setup/gitlab")({
  // The saved token and projects live in a browser-only store.
  ssr: false,
  component: GitlabSetup,
});

const TOKEN_STEP = "gitlabToken";
const PROJECTS_STEP = "gitlabProjects";

const items = [
  { name: TOKEN_STEP, required: true },
  { name: PROJECTS_STEP, required: true },
] as const;

function GitlabSetup() {
  const [token, setToken] = useState(() => store.state.gitlabApiKey ?? "");
  const [activeStep, setActiveStep] = useState<string>(TOKEN_STEP);
  const navigate = useNavigate();

  // Only fetch once the user has moved on from the token, rather than on every
  // keystroke.
  const onProjectsStep = activeStep === PROJECTS_STEP;
  const {
    data: projects,
    isLoading,
    error,
  } = useQuery(gitlabProjectsOptions(onProjectsStep ? token.trim() : null));

  // The questionnaire already refuses to advance past an unanswered required
  // step, but disabling submit says "still loading" instead of "you got it
  // wrong".
  const waitingOnProjects = onProjectsStep && isLoading;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);

    store.setState((state) => ({
      ...state,
      gitlabApiKey: token.trim(),
      gitlabProjects: answers.getAll(PROJECTS_STEP).map(Number),
    }));

    navigate({ to: "/" });
  }

  /**
   * Enter and the Next button can advance without the input ever blurring, so
   * an empty token is caught here rather than left to a failed request.
   */
  function guardAdvance(event: React.SyntheticEvent) {
    if (activeStep === TOKEN_STEP && !token.trim()) event.preventDefault();
  }

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <Card className="p-5">
        <CardTitle>GitLab setup</CardTitle>
        <Questionnaire
          items={items}
          item={activeStep}
          onItemChange={setActiveStep}
          onSubmit={handleSubmit}
          className="w-96"
        >
          <QuestionnaireProgress />

          <QuestionnaireItem name={TOKEN_STEP} required>
            <QuestionnaireTitle>What is your GitLab token?</QuestionnaireTitle>
            <QuestionnaireDescription>
              A personal access token with the <code>read_api</code> and{" "}
              <code>read_user</code> scopes, which you can create on your{" "}
              <Link
                href="https://gitlab.com/-/user_settings/personal_access_tokens"
                target="_blank"
              >
                GitLab profile
              </Link>
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireInput
                aria-label="GitLab token"
                placeholder="glpat-xxx"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") guardAdvance(event);
                }}
              />
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>

          <QuestionnaireItem name={PROJECTS_STEP} required multiple>
            <QuestionnaireTitle>
              Which projects do you want to check for related merge requests?
            </QuestionnaireTitle>
            <QuestionnaireChoices>
              {waitingOnProjects ? <Spinner /> : null}
              {error ? (
                <p className="text-xs text-destructive">
                  Couldn't load projects: {error.message}
                </p>
              ) : null}
              {projects?.map((project) => (
                <QuestionnaireChoice
                  key={project.id}
                  value={String(project.id)}
                  defaultChecked={
                    store.state.gitlabProjects?.includes(project.id) ?? true
                  }
                >
                  <span className="font-medium">
                    {project.name_with_namespace}
                  </span>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError>Check at least one project</QuestionnaireError>
          </QuestionnaireItem>

          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireNext onClick={guardAdvance} />
            <QuestionnaireSubmit disabled={waitingOnProjects} />
          </QuestionnaireActions>
        </Questionnaire>
      </Card>
    </div>
  );
}
