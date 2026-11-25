import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type z from "zod";
import { boardConfigurationOptions, type boardSchema } from "#/lib/api/boards";
import { fieldsOptions, type JiraField } from "#/lib/api/fields";
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
const DEVELOPER_STEP = "developerField";
const STORY_POINTS_STEP = "storyPointsField";
const REVIEW_STEP = "reviewColumn";
const CHECKLIST_STEP = "checklistField";

const customFieldsOfType = (fields: JiraField[] | undefined, type: string) =>
  (fields ?? []).filter((field) => field.custom && field.schema?.type === type);

const stringAnswer = (answers: FormData, name: string) => {
  const value = answers.get(name);
  return typeof value === "string" && value ? value : null;
};

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
  const {
    data: fields,
    isLoading: isFieldsLoading,
    error: fieldsError,
  } = useQuery(fieldsOptions());
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
      name: DEVELOPER_STEP,
      required: false,
      prompt: "Which field holds the developer of a ticket?",
      description:
        "A user field, separate from the assignee. Skip this if your tickets don't have one.",
      pending: isFieldsLoading,
      failure: fieldsError
        ? `Couldn't load Jira's fields: ${fieldsError.message}`
        : undefined,
      choices: customFieldsOfType(fields, "user").map((field) => ({
        value: field.id,
        label: field.name,
        description: field.id,
      })),
    },
    {
      name: FILTERING_STEP,
      required: true,
      multiple: false,
      prompt:
        "When filtering by user, do you want to see only tickets that are assigned to them, or also developed by them?",
      description: "Only applies if you picked a developer field.",
      choices: [
        { label: "Only tickets assigned to them", value: "hide" },
        { label: "Also tickets they developed", value: "show" },
      ],
    },
    {
      name: STORY_POINTS_STEP,
      required: false,
      prompt: "Which field holds story points?",
      description:
        "A number field. The board's own estimation field is preselected. Skip this to hide story points.",
      pending: isFieldsLoading,
      failure: fieldsError
        ? `Couldn't load Jira's fields: ${fieldsError.message}`
        : undefined,
      choices: customFieldsOfType(fields, "number").map((field) => ({
        key: `${boardId}:${field.id}`,
        value: field.id,
        label: field.name,
        description: field.id,
        defaultChecked: field.id === configuration?.estimation?.field.fieldId,
      })),
    },
    {
      name: REVIEW_STEP,
      required: false,
      prompt: "Which column holds tickets in code review?",
      description:
        "That column puts the tickets you need to review first, then your own. Skip this to keep Jira's order.",
      pending: isLoading,
      failure: error
        ? `Couldn't load this board's columns: ${error.message}`
        : undefined,
      choices: columns.map((column) => ({
        key: `${boardId}:review:${column.name}`,
        value: column.name,
        label: column.name,
        defaultChecked: /review/i.test(column.name),
      })),
    },
    {
      name: CHECKLIST_STEP,
      required: false,
      prompt: "Which field holds the checklist in text form?",
      description:
        "Issue Checklist Pro's \"Checklist Text\" field, shown as a tab on the ticket. Skip this if you don't use it.",
      pending: isFieldsLoading,
      failure: fieldsError
        ? `Couldn't load Jira's fields: ${fieldsError.message}`
        : undefined,
      choices: customFieldsOfType(fields, "string").map((field) => ({
        key: `checklist:${field.id}`,
        value: field.id,
        label: field.name,
        description: field.id,
        defaultChecked: field.name.toLowerCase() === "checklist text",
      })),
    },
  ];

  // The columns step can't be answered before its choices exist. The
  // questionnaire already refuses to advance past an unanswered required step,
  // but disabling the buttons says "still loading" instead of "you got it
  // wrong".
  const waitingOnColumns =
    (activeStep === COLUMNS_STEP && isLoading) ||
    (activeStep === REVIEW_STEP && isLoading) ||
    ((activeStep === DEVELOPER_STEP ||
      activeStep === STORY_POINTS_STEP ||
      activeStep === CHECKLIST_STEP) &&
      isFieldsLoading);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);

    // The user picks what stays visible; what they left unchecked is what gets
    // hidden, which is what the board actually needs to know.
    const visible = new Set(answers.getAll(COLUMNS_STEP).map(String));

    const board = boardList.find((board) => board.id === boardId);
    if (!board) return;

    store.setState((state) => ({
      ...state,
      boardId: board.id,
      project: board.location.projectKey,
      includeDevTickets: answers.get(FILTERING_STEP) === "show",
      developerField: stringAnswer(answers, DEVELOPER_STEP),
      storyPointsField: stringAnswer(answers, STORY_POINTS_STEP),
      reviewColumn: stringAnswer(answers, REVIEW_STEP),
      checklistField: stringAnswer(answers, CHECKLIST_STEP),
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
          <QuestionnaireChoices className="max-h-[50vh] overflow-y-auto p-px pr-1">
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
