import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type z from "zod";
import { boardConfigurationOptions, type boardSchema } from "#/lib/api/boards";
import { store } from "#/lib/store";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "./ui/questionnaire";
import { Spinner } from "./ui/spinner";

const BOARD_STEP = "board";
const COLUMNS_STEP = "visibleColumns";
const FILTERING_STEP = "filtering";

type SetupChoice = {
  value: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  /**
   * Overrides the React key. A choice whose default depends on data that can
   * change under it — the columns of whichever board is picked — needs a key
   * that changes too, so it remounts and re-applies `defaultChecked` instead
   * of keeping what the user toggled for the previous board.
   */
  key?: string;
};

type SetupStep = {
  name: string;
  required: boolean;
  /** Renders the choices as checkboxes rather than radios. */
  multiple?: boolean;
  prompt: string;
  description?: string;
  /** Replaces the questionnaire's stock "choose an answer" error. */
  error?: string;
  choices: SetupChoice[];
  /** Stands in for the choices while this step is still waiting on its data. */
  pending?: boolean;
  /** Stands in for the choices when that data never arrived. */
  failure?: string;
  onSelect?: (value: string) => void;
};

export const BoardSetupForm = ({
  boardList,
}: {
  boardList: z.infer<typeof boardSchema>[];
}) => {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<string>(BOARD_STEP);

  const {
    data: configuration,
    isLoading,
    error,
  } = useQuery(boardConfigurationOptions(boardId, true));
  const navigate = useNavigate();

  const columns = configuration?.columnConfig.columns ?? [];

  const items: SetupStep[] = [
    {
      name: BOARD_STEP,
      required: true,
      prompt: "What board do you want to set up?",
      description: "Pick a board from the list below.",
      choices: boardList.map((board) => ({
        value: String(board.id),
        label: board.name,
        description: board.type,
      })),
      onSelect: (value) => setBoardId(Number(value)),
    },
    {
      name: COLUMNS_STEP,
      required: true,
      multiple: true,
      prompt: "Which columns do you want to see?",
      description:
        "Every column is shown by default — uncheck the ones you'd rather hide.",
      error: "Keep at least one column visible.",
      pending: isLoading,
      failure: error
        ? `Couldn't load this board's columns: ${error.message}`
        : undefined,
      choices: columns.map((column) => ({
        key: `${boardId}:${column.name}`,
        value: column.name,
        label: column.name,
        defaultChecked: true,
      })),
    },
    {
      name: FILTERING_STEP,
      required: true,
      multiple: false,
      prompt:
        "When filtering by user, do you want to see only tickets that are assigned to them, or also developed by them?",
      choices: [
        { label: "Only tickets assigned to them", value: "hide" },
        { label: "Also tickets they developed", value: "show" },
      ],
    },
  ];

  // The columns step can't be answered before its choices exist. The
  // questionnaire already refuses to advance past an unanswered required step,
  // but disabling the buttons says "still loading" instead of "you got it
  // wrong".
  const waitingOnColumns = activeStep === COLUMNS_STEP && isLoading;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);

    // The user picks what stays visible; what they left unchecked is what gets
    // hidden, which is what the board actually needs to know.
    const visible = new Set(answers.getAll(COLUMNS_STEP).map(String));

    store.setState((state) => ({
      ...state,
      boardId: Number(answers.get(BOARD_STEP)),
      project: boardList.find((board) => board.id === boardId)!.location
        .projectKey,
      includeDevTickets: answers.get(FILTERING_STEP) === "show",
      hiddenColumns: columns
        .map((column) => column.name)
        .filter((name) => !visible.has(name)),
    }));

    navigate({ to: "/" });
  }

  return (
    <Questionnaire
      items={items}
      onItemChange={setActiveStep}
      onSubmit={handleSubmit}
      className="w-96"
    >
      <QuestionnaireProgress />
      {items.map((question) => (
        <QuestionnaireItem
          key={question.name}
          name={question.name}
          required={question.required}
          multiple={question.multiple}
        >
          <QuestionnaireTitle>{question.prompt}</QuestionnaireTitle>
          <QuestionnaireDescription>
            {question.description}
          </QuestionnaireDescription>
          <QuestionnaireChoices>
            {question.pending ? <Spinner /> : null}
            {question.failure ? (
              <p className="text-xs text-destructive">{question.failure}</p>
            ) : null}
            {question.choices.map((choice) => (
              <QuestionnaireChoice
                key={choice.key ?? choice.value}
                value={choice.value}
                defaultChecked={choice.defaultChecked}
                onChange={(event) => {
                  if (event.target.checked) question.onSelect?.(choice.value);
                }}
              >
                <span className="font-medium">{choice.label}</span>
                {choice.description ? (
                  <span className="text-muted-foreground">
                    {choice.description}
                  </span>
                ) : null}
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>
          <QuestionnaireError>{question.error}</QuestionnaireError>
        </QuestionnaireItem>
      ))}
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext disabled={waitingOnColumns} />
        <QuestionnaireSubmit disabled={waitingOnColumns} />
      </QuestionnaireActions>
    </Questionnaire>
  );
};
