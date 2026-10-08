CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra

SRC_DIR = src
TARGET = engine.out

SRCS = $(SRC_DIR)/main.cpp \
       $(SRC_DIR)/BPlusTree.cpp \
       $(SRC_DIR)/Trie.cpp \
       $(SRC_DIR)/MaxHeap.cpp

OBJS = $(SRCS:.cpp=.o)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(SRC_DIR)/*.o $(TARGET)

.PHONY: clean
