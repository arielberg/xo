// פונקציות שיוגדרו ע"י JS
extern void save_data(int ptr, int len);
extern int load_data(int ptr, int maxlen);

// פונקציה שמייצאת ל-JS
void store(char *str, int len) {
    save_data((int)str, len);
}

int retrieve(char *buffer, int maxlen) {
    return load_data((int)buffer, maxlen);
}