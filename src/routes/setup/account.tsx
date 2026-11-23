import type { QuestionnaireInputType } from "@shadcn/react/questionnaire";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import { ModeToggle } from "#/components/mode-toggle";
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
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "#/components/ui/questionnaire";
import { jiraBaseUrlSchema } from "#/lib/jira-url";
import { store } from "#/lib/store";

export const Route = createFileRoute("/setup/account")({
  // The guard below reads a store that only exists in the browser, so this
  // route has to skip the server pass or it would always see an empty token.
  ssr: false,
  beforeLoad: () => {
    if (store.state.apiToken) throw redirect({ to: "/setup/board" });
  },
  component: RouteComponent,
});

type SetupStep = {
  name: string;
  required: boolean;
  prompt: string;
  description?: string;
  link?: { href: string; label: string };
  choices?: { value: string; label: string; description?: string }[];
  input?: {
    label: string;
    placeholder?: string;
    type?: QuestionnaireInputType;
  };
  schema: z.ZodType;
};

const items: ReadonlyArray<SetupStep> = [
  {
    name: "baseUrl",
    required: true,
    prompt: "What is your Jira base URL?",
    description: "For example: https://yourcompany.atlassian.net",
    input: { label: "URL", placeholder: "https://" },
    schema: jiraBaseUrlSchema,
  },
  {
    name: "email",
    required: true,
    prompt: "What is your Jira email?",
    input: { label: "Email", placeholder: "hello@email.com" },
    schema: z.email(),
  },
  {
    name: "token",
    required: true,
    prompt: "What is your Jira token?",
    description: "You can create a token on your ",
    link: {
      label: "Atlassian profile",
      href: "https://id.atlassian.com/manage-profile/security/api-tokens",
    },
    input: {
      label: "Token",
      placeholder: "Enter your token",
      type: "password",
    },
    schema: z.string().min(1),
  },
] as const;

const setupSchema = z.object({
  baseUrl: jiraBaseUrlSchema,
  email: z.email(),
  token: z.string().min(1),
});

/**
 * An empty answer is left to the questionnaire's own `required` handling, which
 * stays quiet until the user tries to move on. Anything actually typed is
 * checked against the step's schema.
 */
function getStepError(step: SetupStep, value: string | undefined) {
  if (!value?.trim()) return undefined;

  const result = step.schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function RouteComponent() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(items[0].name);
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Read the answers from state rather than FormData. The questionnaire only
    // puts a `name` on an input once its React `value` is non-empty, and parks
    // it on `form=""` until then, so anything that fills a field without going
    // through onChange leaves the input orphaned and the FormData empty.
    const result = setupSchema.safeParse(values);

    // The questionnaire refuses to submit while any step is invalid, so this
    // only guards against a value that never went through one of the inputs.
    if (!result.success) return;

    store.setState((state) => ({
      ...state,
      baseUrl: result.data.baseUrl,
      apiToken: btoa(`${result.data.email}:${result.data.token}`),
    }));

    navigate({ to: "/setup/board" });
  }

  function touch(name: string) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  /**
   * Enter and the action buttons can advance the questionnaire without the input
   * ever blurring, so both paths commit the active step first. That reveals the
   * error and holds the user on the step instead of stepping over a bad value.
   */
  function guardAdvance(event: React.SyntheticEvent) {
    const step = items.find(({ name }) => name === activeStep);
    if (!step) return;

    touch(step.name);
    if (getStepError(step, values[step.name])) event.preventDefault();
  }

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <ModeToggle />
      <Card className="p-5">
        <CardTitle>Account setup</CardTitle>
        <Questionnaire
          items={items}
          item={activeStep}
          onItemChange={setActiveStep}
          onSubmit={handleSubmit}
          className="w-96"
        >
          <QuestionnaireProgress />
          {items.map((question) => {
            const error = touched[question.name]
              ? getStepError(question, values[question.name])
              : undefined;

            return (
              <QuestionnaireItem
                key={question.name}
                name={question.name}
                required={question.required}
                invalid={error !== undefined}
              >
                <QuestionnaireTitle>{question.prompt}</QuestionnaireTitle>
                <QuestionnaireDescription>
                  {question.description}
                  {question.link ? (
                    <Link href={question.link.href} target="_blank">
                      {question.link.label}
                    </Link>
                  ) : null}
                </QuestionnaireDescription>
                <QuestionnaireChoices>
                  {question.choices?.map((choice) => (
                    <QuestionnaireChoice
                      key={choice.value}
                      value={choice.value}
                    >
                      <span className="font-medium">{choice.label}</span>
                      {"description" in choice ? (
                        <span className="text-muted-foreground">
                          {choice.description}
                        </span>
                      ) : null}
                    </QuestionnaireChoice>
                  ))}
                  {"input" in question ? (
                    <QuestionnaireInput
                      aria-label={question.input?.label}
                      placeholder={question.input?.placeholder}
                      type={question.input?.type ?? "text"}
                      value={values[question.name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [question.name]: event.target.value,
                        }))
                      }
                      onBlur={() => touch(question.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") guardAdvance(event);
                      }}
                    />
                  ) : null}
                </QuestionnaireChoices>
                <QuestionnaireError>{error}</QuestionnaireError>
              </QuestionnaireItem>
            );
          })}
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext onClick={guardAdvance} />
            <QuestionnaireSubmit onClick={guardAdvance} />
          </QuestionnaireActions>
        </Questionnaire>
      </Card>
    </div>
  );
}
