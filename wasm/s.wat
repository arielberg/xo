(module
  ;; מייצאים את הפונקציה add
  (func (export "add") (param i32 i32) (result i32)
    local.get 0   ;; טוען את הפרמטר הראשון
    local.get 1   ;; טוען את הפרמטר השני
    i32.add       ;; מחבר אותם
  )
)